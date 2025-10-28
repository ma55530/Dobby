import math
import argparse
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from supabase import create_client, Client

# -------- Dataset & utilities --------
class RatingsDataset(Dataset):
    # Holds user, movie, and rating tensors for the dataset
    def __init__(self, user_idx: np.ndarray, movie_idx: np.ndarray, ratings: np.ndarray):
        assert len(user_idx) == len(movie_idx) == len(ratings)
        self.users = torch.as_tensor(user_idx, dtype=torch.long)
        self.movies = torch.as_tensor(movie_idx, dtype=torch.long)
        self.ratings = torch.as_tensor(ratings, dtype=torch.float32)

    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, idx):
        return self.users[idx], self.movies[idx], self.ratings[idx]

def build_id_maps(df: pd.DataFrame, user_col='userId', movie_col='movieId'):
    # Map user/movie IDs to contiguous indices and return encodings
    unique_users = df[user_col].unique()
    unique_movies = df[movie_col].unique()
    user2idx = {u: i for i, u in enumerate(np.sort(unique_users))}
    movie2idx = {m: j for j, m in enumerate(np.sort(unique_movies))}
    user_idx = df[user_col].map(user2idx).to_numpy()
    movie_idx = df[movie_col].map(movie2idx).to_numpy()
    ratings = df['rating'].to_numpy(dtype=np.float32)
    return user2idx, movie2idx, user_idx, movie_idx, ratings

# -------- Model --------
class MatrixFactorization(nn.Module):
    # Standard latent factor model with user/movie bias and optional dropout
    def __init__(self, n_users, n_movies, n_factors=50, dropout=0.0):
        super().__init__()
        self.user_factors = nn.Embedding(n_users, n_factors)
        self.movie_factors = nn.Embedding(n_movies, n_factors)
        self.user_bias = nn.Embedding(n_users, 1)
        self.movie_bias = nn.Embedding(n_movies, 1)
        self.global_bias = nn.Parameter(torch.tensor([0.0]))
        nn.init.normal_(self.user_factors.weight, std=0.01)
        nn.init.normal_(self.movie_factors.weight, std=0.01)
        nn.init.constant_(self.user_bias.weight, 0.0)
        nn.init.constant_(self.movie_bias.weight, 0.0)
        self.dropout = nn.Dropout(dropout) if dropout > 0 else nn.Identity()

    def forward(self, user, movie):
        pu = self.user_factors(user)
        qi = self.movie_factors(movie)
        pu = self.dropout(pu)
        qi = self.dropout(qi)
        dot = (pu * qi).sum(dim=1)
        b_u = self.user_bias(user).squeeze(1)
        b_i = self.movie_bias(movie).squeeze(1)
        return dot + b_u + b_i + self.global_bias

# -------- Training / Evaluation --------
def rmse(preds, targets):
    # Root mean squared error for predictions vs. targets
    return math.sqrt(((preds - targets) ** 2).mean().item())

def evaluate(model, dataloader, device):
    # Compute RMSE on the full dataset
    model.eval()
    ys, y_preds = [], []
    with torch.no_grad():
        for u, m, r in dataloader:
            u, m, r = u.to(device), m.to(device), r.to(device)
            p = model(u, m)
            ys.append(r.cpu())
            y_preds.append(p.cpu())
    y = torch.cat(ys)
    yp = torch.cat(y_preds)
    return rmse(yp, y)

def train_fn(model, train_loader, val_loader, device,
             epochs=1, lr=1e-3, weight_decay=1e-6, clip_grad=None):
    # Training loop with optional gradient clipping, validation RMSE tracking
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.MSELoss()
    best_val = float('inf')

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss, cnt = 0.0, 0
        for u, m, r in train_loader:
            u, m, r = u.to(device), m.to(device), r.to(device)
            optimizer.zero_grad()
            preds = model(u, m)
            loss = criterion(preds, r)
            loss.backward()
            if clip_grad:
                torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad)
            optimizer.step()
            total_loss += loss.item() * r.size(0)
            cnt += r.size(0)

        train_rmse = math.sqrt(total_loss / cnt)
        val_rmse = evaluate(model, val_loader, device)
        print(f"Epoch {epoch:03d} | train_rmse={train_rmse:.4f} | val_rmse={val_rmse:.4f}")

        if val_rmse < best_val:
            best_val = val_rmse

    return best_val

# -------- Main --------
def main(args):
    # Load ratings from CSV and ensure string user IDs
    df = pd.read_csv(args.ratings_csv)
    df["userId"] = df["userId"].astype(str)

    # Set up Supabase client and fetch remote ratings table
    supabase: Client = create_client(args.supabase_url, args.supabase_key)
    response = supabase.table(args.import_table).select("user_id, movie_id, rating").execute()

    # Merge remote data with local ratings
    df_supabase = pd.DataFrame(response.data).rename(columns={
        "user_id": "userId",
        "movie_id": "movieId",
        "rating": "rating"
    })
    df = pd.concat([df, df_supabase], ignore_index=True)

    # Prepare train/validation splits and map all IDs to indices
    train_df, val_df = train_test_split(df, test_size=args.val_size, random_state=42)
    user2idx, movie2idx, train_u, train_m, train_r = build_id_maps(train_df, 'userId', 'movieId')
    val_df = val_df[val_df['userId'].isin(user2idx) & val_df['movieId'].isin(movie2idx)]
    val_u = val_df['userId'].map(user2idx).to_numpy()
    val_m = val_df['movieId'].map(movie2idx).to_numpy()
    val_r = val_df['rating'].to_numpy(dtype=np.float32)

    num_users, num_movies = len(user2idx), len(movie2idx)
    print(f"Train samples: {len(train_r)}, Val samples: {len(val_r)} | users: {num_users}, movies: {num_movies}")

    # DataLoader setup
    train_loader = DataLoader(RatingsDataset(train_u, train_m, train_r), batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(RatingsDataset(val_u, val_m, val_r), batch_size=args.batch_size)

    # Device and model initialization
    device = torch.device("cuda" if torch.cuda.is_available() and args.use_cuda else "cpu")
    model = MatrixFactorization(num_users, num_movies, n_factors=args.factors, dropout=args.dropout).to(device)
    model.global_bias.data = torch.tensor([train_r.mean()], device=device)

    # Run training loop
    best_val = train_fn(
        model, train_loader, val_loader, device,
        epochs=args.epochs, lr=args.lr, weight_decay=args.weight_decay, clip_grad=args.clip_grad
    )
    print("Best val RMSE:", best_val)

    # Prepare movie embeddings to export
    movie_embeddings = model.movie_factors.weight.detach().cpu().numpy()
    movie_embeddings = np.nan_to_num(movie_embeddings, nan=0.0, posinf=0.0, neginf=0.0)
    idx2movie = {v: k for k, v in movie2idx.items()}
    movie_ids = [int(idx2movie[i]) for i in range(len(idx2movie))]

    df_embeddings = pd.DataFrame({
        "movie_id": movie_ids,
        "embedding": movie_embeddings.tolist()
    })

    # Clear and populate movie embedding table
    print(f"Deleting all existing rows from {args.movie_export_table}...")
    delete_resp = supabase.table(args.movie_export_table).delete().neq("movie_id", -1).execute()
    print("All existing rows deleted successfully.")

    print("Saving embeddings to Supabase...")
    records = df_embeddings.to_dict(orient="records")
    chunk_size = 500
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        response = supabase.table(args.movie_export_table).insert(chunk).execute()
        if hasattr(response, "error") and response.error:
            print("Error inserting chunk:", response.error)
        else:
            print(f"Inserted rows {i}-{i + len(chunk) - 1}")
    print("All movie embeddings saved to Supabase.")

    # Prepare and save user embeddings (only Supabase users)
    user_embeddings = model.user_factors.weight.detach().cpu().numpy()
    user_embeddings = np.nan_to_num(user_embeddings, nan=0.0, posinf=0.0, neginf=0.0)
    supabase_user_ids = df_supabase["userId"].unique()
    idx2user = {v: k for k, v in user2idx.items()}
    filtered_records = []
    for idx, emb in enumerate(user_embeddings):
        user_id = idx2user[idx]
        if user_id in supabase_user_ids:
            filtered_records.append({"user_id": user_id, "embedding": emb.tolist()})
    df_user_embeddings = pd.DataFrame(filtered_records)

    print(f"Deleting all existing rows from {args.user_export_table}...")
    delete_resp = supabase.table(args.user_export_table).delete().not_.is_("user_id", "null").execute()
    print("All existing rows deleted successfully.")

    print("Saving USER embeddings to Supabase...")
    records = df_user_embeddings.to_dict(orient="records")
    chunk_size = 500
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        response = supabase.table(args.user_export_table).insert(chunk).execute()
    print("All USER embeddings saved to Supabase.")

# -------- CLI for script entry --------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ratings_csv", type=str, default="./data/ratings.csv")
    parser.add_argument("--val_size", type=float, default=0.1)
    parser.add_argument("--batch_size", type=int, default=2048)
    parser.add_argument("--factors", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight_decay", type=float, default=1e-6)
    parser.add_argument("--dropout", type=float, default=0.0)
    parser.add_argument("--clip_grad", type=float, default=None)
    parser.add_argument("--use_cuda", action="store_true")
    parser.add_argument("--supabase_url", type=str, required=True)
    parser.add_argument("--supabase_key", type=str, required=True)
    parser.add_argument("--movie_export_table", type=str, default="movie_embeddings")
    parser.add_argument("--import_table", type=str, default="ratings")
    parser.add_argument("--user_export_table", type=str, default="user_embeddings")
    args = parser.parse_args()
    main(args)
