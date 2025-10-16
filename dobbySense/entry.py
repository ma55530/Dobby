from fastapi import FastAPI, HTTPException
import torch
from train_mf_torch_movies import MatrixFactorization, predict_for_user
from fastapi.encoders import jsonable_encoder

app = FastAPI()

# --- Load model and mappings once on startup ---
checkpoint = torch.load("mf_best_movies.pth", map_location="cpu", weights_only=False)
user2idx = checkpoint["user2idx"]
movie2idx = checkpoint["movie2idx"]
idx2movie = checkpoint["idx2movie"]
config = checkpoint["config"]

num_users = len(user2idx)
num_movies = len(movie2idx)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = MatrixFactorization(num_users, num_movies, n_factors=config["n_factors"])
model.load_state_dict(checkpoint["model_state"])
model.to(device)
model.eval()


@app.get("/recommend/{userID}")
def recommend(userID: str, topk: int = 15):
    userID = int(userID)
    if userID not in user2idx:
        raise HTTPException(status_code=404, detail="User not found in model.")

    recs = predict_for_user(
        model, userID, user2idx, movie2idx, idx2movie, device, topk=topk
    )

    # Convert to JSON-friendly format
    recommendations = [
    {"movieId": int(movie_id), "score": float(score)} for movie_id, score in recs
    ]

    return jsonable_encoder({"userID": userID, "recommendations": recommendations})
