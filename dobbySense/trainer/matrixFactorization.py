import os
import math
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from supabase import create_client, Client

# ============================================================
# CONFIGURATION
# ============================================================

# --- Secrets (Load from Environment Variables) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY environment variables.")

# --- Data Paths ---
# Use GCS paths directly; Vertex AI handles auth automatically if SA has permissions
RATINGS_PATH = os.environ.get("RATINGS_PATH", "gs://your-bucket/ratings.csv")
MOVIES_PATH = os.environ.get("MOVIES_PATH", "gs://your-bucket/movies.csv")
SHOWS_PATH = os.environ.get("SHOWS_PATH", "gs://your-bucket/shows.csv")

# --- Supabase Table Names ---
RATINGS_TABLE = "rating"
MOVIE_EMBEDDINGS_TABLE = "movie_embeddings"
SHOW_EMBEDDINGS_TABLE = "show_embeddings"
USER_EMBEDDINGS_TABLE = "user_embeddings"
GENRE_LAYERS_TABLE = "genre_layers"

# --- Data Processing ---
TEST_SIZE = 0.0
RANDOM_STATE = 42
GENRE_COLUMN_PREFIX = "g"

# --- DataLoader Settings ---
BATCH_SIZE = 2048
NUM_WORKERS = 0 # Set to 0 for safer multiprocessing in some container envs, or 2
PIN_MEMORY = True

# --- Model Hyperparameters ---
N_FACTORS = 64
MODEL_DROPOUT = 0.1
EMBEDDING_INIT_STD = 0.01
GENRE_WEIGHT = 0.5 

# --- Training Hyperparameters ---
EPOCHS = 5
LEARNING_RATE = 1e-3
WEIGHT_DECAY = 1e-6
CLIP_GRAD_NORM = None 

# --- Export Settings ---
CHUNK_SIZE = 500
GENRE_LAYER_NAME = "hybrid_mf_v1"

# ============================================================
# DATASET & UTILS
# ============================================================

class RatingsDataset(Dataset):
    def __init__(self, user_idx, movie_idx, ratings, genre_matrix):
        assert len(user_idx) == len(movie_idx) == len(ratings)
        self.users = torch.tensor(user_idx, dtype=torch.long)
        self.movies = torch.tensor(movie_idx, dtype=torch.long)
        self.ratings = torch.tensor(ratings, dtype=torch.float32)
        self.genres = torch.tensor(genre_matrix, dtype=torch.float32)

    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, idx):
        return self.users[idx], self.movies[idx], self.ratings[idx], self.genres[idx]

def build_id_maps(df: pd.DataFrame, user_col='userId', movie_col='movieId'):
    unique_users = df[user_col].unique()
    unique_movies = df[movie_col].unique()
    user2idx = {u: i for i, u in enumerate(np.sort(unique_users))}
    movie2idx = {m: j for j, m in enumerate(np.sort(unique_movies))}
    user_idx = df[user_col].map(user2idx).to_numpy()
    movie_idx = df[movie_col].map(movie2idx).to_numpy()
    ratings = df['rating'].to_numpy(dtype=np.float32)
    return user2idx, movie2idx, user_idx, movie_idx, ratings

# ============================================================
# MODEL
# ============================================================

class HybridMatrixFactorization(nn.Module):
    def __init__(self, n_users, n_movies, n_factors, n_genres, dropout=0.0, genre_weight=1.0):
        super().__init__()
        self.user_factors = nn.Embedding(n_users, n_factors)
        self.movie_factors = nn.Embedding(n_movies, n_factors)
        self.genre_layer = nn.Linear(n_genres, n_factors)
        self.user_bias = nn.Embedding(n_users, 1)
        self.movie_bias = nn.Embedding(n_movies, 1)
        self.global_bias = nn.Parameter(torch.tensor([0.0]))
        self.dropout = nn.Dropout(dropout) if dropout > 0 else nn.Identity()
        self.genre_weight = genre_weight

        nn.init.normal_(self.user_factors.weight, std=EMBEDDING_INIT_STD)
        nn.init.normal_(self.movie_factors.weight, std=EMBEDDING_INIT_STD)
        nn.init.constant_(self.user_bias.weight, 0.0)
        nn.init.constant_(self.movie_bias.weight, 0.0)

    def forward(self, user, movie, genre_vec):
        pu = self.user_factors(user)
        qi = self.movie_factors(movie)
        genre_emb = self.genre_layer(genre_vec)
        qi = qi + self.genre_weight * genre_emb
        pu = self.dropout(pu)
        qi = self.dropout(qi)
        dot = (pu * qi).sum(dim=1)
        b_u = self.user_bias(user).squeeze(1)
        b_i = self.movie_bias(movie).squeeze(1)
        return dot + b_u + b_i + self.global_bias

# ============================================================
# TRAINING LOGIC
# ============================================================

def rmse(preds, targets):
    return math.sqrt(((preds - targets) ** 2).mean().item())

def evaluate(model, dataloader, device):
    model.eval()
    ys, y_preds = [], []
    with torch.no_grad():
        for u, m, r, g in dataloader:
            u, m, r, g = u.to(device), m.to(device), r.to(device), g.to(device)
            p = model(u, m, g)
            ys.append(r.cpu())
            y_preds.append(p.cpu())
    y = torch.cat(ys)
    yp = torch.cat(y_preds)
    return rmse(yp, y)

def train_fn(model, train_loader, val_loader, device,
             epochs=EPOCHS, lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY, clip_grad=CLIP_GRAD_NORM):
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    criterion = nn.MSELoss()
    best_metric = float('inf')

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss, cnt = 0.0, 0
        for u, m, r, g in train_loader:
            u, m, r, g = u.to(device), m.to(device), r.to(device), g.to(device)
            optimizer.zero_grad()
            preds = model(u, m, g)
            loss = criterion(preds, r)
            loss.backward()
            if clip_grad:
                torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad)
            optimizer.step()
            total_loss += loss.item() * r.size(0)
            cnt += r.size(0)

        train_rmse = math.sqrt(total_loss / cnt)
        
        if val_loader:
            val_rmse = evaluate(model, val_loader, device)
            print(f"Epoch {epoch:03d} | train_rmse={train_rmse:.4f} | val_rmse={val_rmse:.4f}")
            metric = val_rmse
        else:
            print(f"Epoch {epoch:03d} | train_rmse={train_rmse:.4f}")
            metric = train_rmse

        if metric < best_metric:
            best_metric = metric

    return best_metric

def main():
    print("Starting DobbySense Trainer...")
    
    # 1. Load Data
    print(f"Reading data from {RATINGS_PATH} and {MOVIES_PATH}...")
    df = pd.read_csv(RATINGS_PATH)
    movies_df = pd.read_csv(MOVIES_PATH)

    df["userId"] = df["userId"].astype(str)
    movies_df["movieId"] = movies_df["movieId"].astype(int)
    genre_cols = [c for c in movies_df.columns if c.startswith(GENRE_COLUMN_PREFIX)]
    n_genres = len(genre_cols)

    print(f"Loaded {len(df)} ratings and {len(movies_df)} movies with {n_genres} genres")

    # 2. Fetch Supabase Data
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Select only relevant columns
    response = supabase.table(RATINGS_TABLE).select("user_id, movie_id, rating").execute()
    df_supabase = pd.DataFrame(response.data)
    
    if not df_supabase.empty:
        # Filter for movie ratings only (exclude show ratings where movie_id is None)
        if "movie_id" in df_supabase.columns:
            df_supabase = df_supabase.dropna(subset=["movie_id"])
            
        df_supabase = df_supabase.rename(columns={
            "user_id": "userId", "movie_id": "movieId", "rating": "rating"
        })
        
        if not df_supabase.empty:
            # Ensure correct types
            df_supabase["movieId"] = df_supabase["movieId"].astype(int)
            df = pd.concat([df, df_supabase], ignore_index=True)
            print(f"After merging Supabase data: {len(df)} total ratings")
    else:
        print("No new ratings found in Supabase.")

    # 3. Prepare Data
    if TEST_SIZE > 0:
        train_df, val_df = train_test_split(df, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    else:
        train_df = df
        val_df = pd.DataFrame(columns=df.columns)

    user2idx, movie2idx, train_u, train_m, train_r = build_id_maps(train_df)

    if not val_df.empty:
        val_df = val_df[val_df['userId'].isin(user2idx) & val_df['movieId'].isin(movie2idx)]
        val_u = val_df['userId'].map(user2idx).to_numpy()
        val_m = val_df['movieId'].map(movie2idx).to_numpy()
        val_r = val_df['rating'].to_numpy(dtype=np.float32)
    else:
        val_u = val_m = val_r = np.array([], dtype=np.float32)

    genre_matrix = np.zeros((len(movie2idx), n_genres), dtype=np.float32)
    for _, row in movies_df.iterrows():
        mid = row['movieId']
        if mid in movie2idx:
            genre_matrix[movie2idx[mid]] = row[genre_cols].values.astype(np.float32)

    train_genres = genre_matrix[train_m]
    val_genres = genre_matrix[val_m] if len(val_m) > 0 else np.zeros((0, n_genres))

    num_users, num_movies = len(user2idx), len(movie2idx)
    
    # 4. Data Loaders
    train_loader = DataLoader(
        RatingsDataset(train_u, train_m, train_r, train_genres),
        batch_size=BATCH_SIZE,
        shuffle=True,
        pin_memory=PIN_MEMORY,
        num_workers=NUM_WORKERS
    )
    val_loader = None
    if len(val_u) > 0:
        val_loader = DataLoader(
            RatingsDataset(val_u, val_m, val_r, val_genres),
            batch_size=BATCH_SIZE,
            pin_memory=PIN_MEMORY,
            num_workers=NUM_WORKERS
        )

    # 5. Train
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model = HybridMatrixFactorization(
        num_users, num_movies, N_FACTORS, n_genres, 
        dropout=MODEL_DROPOUT, genre_weight=GENRE_WEIGHT
    ).to(device)
    model.global_bias.data = torch.tensor([train_r.mean()], device=device)

    train_fn(model, train_loader, val_loader, device,
             epochs=EPOCHS, lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY, clip_grad=CLIP_GRAD_NORM)

    # 6. Export Movie Embeddings
    print("Exporting Movie Embeddings...")
    genre_tensor = torch.tensor(genre_matrix, dtype=torch.float32).to(device)
    movie_embeddings = model.movie_factors.weight + model.genre_weight * model.genre_layer(genre_tensor)
    movie_embeddings = movie_embeddings.detach().cpu().numpy()
    movie_embeddings = np.nan_to_num(movie_embeddings)

    idx2movie = {v: k for k, v in movie2idx.items()}
    df_movie_embeddings = pd.DataFrame({
        "movie_id": [int(idx2movie[i]) for i in range(len(idx2movie))],
        "embedding": movie_embeddings.tolist()
    })

    records = df_movie_embeddings.to_dict(orient="records")
    for i in range(0, len(records), CHUNK_SIZE):
        supabase.table(MOVIE_EMBEDDINGS_TABLE).upsert(records[i:i+CHUNK_SIZE], on_conflict='movie_id').execute()

    # 6.5 Export Show Embeddings (Content-based only)
    print("Exporting Show Embeddings...")
    try:
        shows_df = pd.read_csv(SHOWS_PATH)
        print(f"Loaded {len(shows_df)} shows from {SHOWS_PATH}")

        # ID standardization: use 'id' if 'showId' missing, or cast 'showId'
        if "showId" not in shows_df.columns and "id" in shows_df.columns:
            shows_df["showId"] = shows_df["id"]
        
        if "showId" in shows_df.columns:
            shows_df["showId"] = shows_df["showId"].astype(int)
            
            # Prepare genre matrix for shows
            # We assume shows.csv has the same genre columns (gAction, gComedy, etc.)
            show_genre_matrix = np.zeros((len(shows_df), n_genres), dtype=np.float32)
            
            # Only use columns that actually exist in shows_df
            valid_show_genres = [c for c in genre_cols if c in shows_df.columns]
            if len(valid_show_genres) < n_genres:
                print(f"Warning: Shows data missing {n_genres - len(valid_show_genres)} genre columns. Filling with 0.")

            if valid_show_genres:
                # Map columns by name
                genre_indices = [genre_cols.index(c) for c in valid_show_genres]
                show_genre_matrix[:, genre_indices] = shows_df[valid_show_genres].values.astype(np.float32)

            # Compute Embeddings
            show_genre_tensor = torch.tensor(show_genre_matrix, dtype=torch.float32).to(device)
            with torch.no_grad():
                # For cold-start shows, embedding is purely the genre projection
                # (Assuming latent factor part is mean/zero)
                show_embeddings = model.genre_weight * model.genre_layer(show_genre_tensor)
            
            show_embeddings = show_embeddings.detach().cpu().numpy()
            show_embeddings = np.nan_to_num(show_embeddings)

            # Prepare records
            df_show_embeddings = pd.DataFrame({
                "show_id": shows_df["showId"].values,
                "embedding": show_embeddings.tolist()
            })
            
            show_records = df_show_embeddings.to_dict(orient="records")
            print(f"Saving {len(show_records)} show embeddings...")
            
            for i in range(0, len(show_records), CHUNK_SIZE):
                supabase.table(SHOW_EMBEDDINGS_TABLE).upsert(show_records[i:i+CHUNK_SIZE], on_conflict='show_id').execute()
        else:
            print("Error: 'showId' column missing in shows.csv. Skipping show embeddings.")

    except Exception as e:
        print(f"Error processing shows: {e}")

    # 7. Export User Embeddings
    print("Exporting User Embeddings...")
    user_embeddings_weights = model.user_factors.weight.detach().cpu().numpy()
    user_embeddings_weights = np.nan_to_num(user_embeddings_weights)

    if not df_supabase.empty and "userId" in df_supabase.columns:
        supabase_user_ids = set(df_supabase["userId"].unique())
    else:
        supabase_user_ids = set()

    idx2user = {v: k for k, v in user2idx.items()}

    trained_records = []
    for i, emb in enumerate(user_embeddings_weights):
        if idx2user[i] in supabase_user_ids:
            trained_records.append({"user_id": idx2user[i], "embedding": emb.tolist()})

    # Fold-in Logic
    print("Processing Fold-in users...")
    try:
        resp = supabase.table("user_genre_preferences").select("user_id, genre").execute()
        df_prefs = pd.DataFrame(resp.data)
    except Exception as e:
        print(f"Skipping fold-in users (error): {e}")
        df_prefs = pd.DataFrame()

    fold_in_records = []
    if not df_prefs.empty:
        W_genre = model.genre_layer.weight.detach().cpu().numpy()
        b_genre = model.genre_layer.bias.detach().cpu().numpy()
        trained_user_ids = set(r['user_id'] for r in trained_records)
        grouped = df_prefs.groupby("user_id")['genre'].apply(list)

        for uid, genres in grouped.items():
            if uid in trained_user_ids:
                continue 
            indices = []
            for g in genres:
                target_col = GENRE_COLUMN_PREFIX + g
                if target_col in genre_cols:
                        indices.append(genre_cols.index(target_col))
                elif g in genre_cols:
                        indices.append(genre_cols.index(g))
            if indices:
                vectors = W_genre[:, indices]
                avg_vector = vectors.mean(axis=1) + b_genre
                fold_in_records.append({
                    "user_id": uid,
                    "embedding": avg_vector.tolist()
                })

    all_records = trained_records + fold_in_records
    for i in range(0, len(all_records), CHUNK_SIZE):
        chunk = all_records[i:i+CHUNK_SIZE]
        supabase.table(USER_EMBEDDINGS_TABLE).upsert(chunk, on_conflict='user_id').execute()

    # 8. Export Layer Config
    print("Exporting Genre Layer Metadata...")
    W = model.genre_layer.weight.detach().cpu().numpy()
    b = model.genre_layer.bias.detach().cpu().numpy()
    
    genre_layer_record = {
        "name": GENRE_LAYER_NAME,
        "genre_names": genre_cols,
        "weight": W.tolist(),
        "bias": b.tolist()
    }
    
    supabase.table(GENRE_LAYERS_TABLE).delete().eq("name", GENRE_LAYER_NAME).execute()
    supabase.table(GENRE_LAYERS_TABLE).insert(genre_layer_record).execute()
    
    print("Training job complete!")

if __name__ == "__main__":
    main()
