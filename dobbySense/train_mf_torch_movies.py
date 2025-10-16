# train_mf_torch_movies.py
import os
import math
import argparse
from typing import Tuple, Dict

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader

# -------- Dataset / utilities --------
class RatingsDataset(Dataset):
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


# -------- Training / Eval --------
def rmse(preds, targets):
    return math.sqrt(((preds - targets) ** 2).mean().item())

def evaluate(model, dataloader, device):
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
             user2idx, movie2idx, train_r, args,
             epochs=10, lr=1e-3, weight_decay=1e-6,
             clip_grad=None, save_path=None):
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
        if val_rmse < best_val and save_path:
            best_val = val_rmse
            # Save model + mappings + metadata
            idx2movie = {v: k for k, v in movie2idx.items()}
            torch.save({
                "model_state": model.state_dict(),
                "user2idx": user2idx,
                "movie2idx": movie2idx,
                "idx2movie": idx2movie,
                "config": {
                    "n_factors": args.factors,
                    "global_bias": float(model.global_bias.item()),
                    "train_mean_rating": float(train_r.mean())
                }
            }, save_path)
    return best_val


# -------- Recommend --------
def predict_for_user(model, uid, user2idx, movie2idx, idx2movie, device, known_movies=None, topk=10):
    if uid not in user2idx:
        raise KeyError("user not in training set")
    uidx = user2idx[uid]
    n_movies = len(movie2idx)
    model.eval()
    with torch.no_grad():
        users = torch.full((n_movies,), uidx, dtype=torch.long, device=device)
        movies = torch.arange(n_movies, dtype=torch.long, device=device)
        preds = model(users, movies).cpu().numpy()
    candidates = []
    for idx, score in enumerate(preds):
        orig_movie = idx2movie[idx]
        if known_movies and orig_movie in known_movies:
            continue
        candidates.append((orig_movie, score))
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[:topk]


# -------- Main --------
def main(args):
    df = pd.read_csv(args.ratings_csv)
    movies_data = pd.read_csv(args.movies_csv)

    # Merge for metadata
    df = pd.merge(df, movies_data, on='movieId', how='left')

    train_df, val_df = train_test_split(df, test_size=args.val_size, random_state=42)
    user2idx, movie2idx, train_u, train_m, train_r = build_id_maps(train_df, 'userId', 'movieId')

    val_df = val_df[val_df['userId'].isin(user2idx) & val_df['movieId'].isin(movie2idx)]
    val_u = val_df['userId'].map(user2idx).to_numpy()
    val_m = val_df['movieId'].map(movie2idx).to_numpy()
    val_r = val_df['rating'].to_numpy(dtype=np.float32)

    num_users, num_movies = len(user2idx), len(movie2idx)
    print(f"Train samples: {len(train_r)}, Val samples: {len(val_r)} | users: {num_users}, movies: {num_movies}")

    train_loader = DataLoader(RatingsDataset(train_u, train_m, train_r), batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(RatingsDataset(val_u, val_m, val_r), batch_size=args.batch_size)

    device = torch.device("cuda" if torch.cuda.is_available() and args.use_cuda else "cpu")
    model = MatrixFactorization(num_users, num_movies, n_factors=args.factors, dropout=args.dropout).to(device)
    model.global_bias.data = torch.tensor([train_r.mean()], device=device)

    best = train_fn(
        model, train_loader, val_loader, device,
        user2idx, movie2idx, train_r, args,
        epochs=args.epochs, lr=args.lr,
        weight_decay=args.weight_decay,
        clip_grad=args.clip_grad, save_path=args.save_path
        )


    print("Best val RMSE:", best)

    idx2movie = {v: k for k, v in movie2idx.items()}
    user_known = {}
    for u, m in zip(train_df['userId'], train_df['movieId']):
        user_known.setdefault(u, set()).add(m)

    some_user = list(user2idx.keys())[0]
    recs = predict_for_user(model, some_user, user2idx, movie2idx, idx2movie, device, known_movies=user_known.get(some_user, set()), topk=10)

    print("\nTop recommendations for user", some_user)
    for movie, score in recs:
        title = movies_data.loc[movies_data['movieId'] == movie, 'title'].values
        title = title[0] if len(title) else str(movie)
        print(f"{title:50s} | score={score:.3f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ratings_csv", type=str, required=True, help="CSV with userId,movieId,rating")
    parser.add_argument("--movies_csv", type=str, required=True, help="CSV with movieId,title")
    parser.add_argument("--val_size", type=float, default=0.1)
    parser.add_argument("--batch_size", type=int, default=2048)
    parser.add_argument("--factors", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight_decay", type=float, default=1e-6)
    parser.add_argument("--dropout", type=float, default=0.0)
    parser.add_argument("--clip_grad", type=float, default=None)
    parser.add_argument("--use_cuda", action="store_true")
    parser.add_argument("--save_path", type=str, default="mf_best_movies.pth")
    args = parser.parse_args()
    main(args)
