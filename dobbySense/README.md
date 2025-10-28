# Matrix Factorization Movie Recommender — PyTorch & Vertex AI Ready

This project offers a scalable, Dockerized neural matrix factorization model for large-scale movie recommendation tasks, ready for production deployment on Google Vertex AI or any modern container platform.

---

## Project Overview

This model performs collaborative filtering via learned user and movie embeddings, predicting movie ratings in a form suitable for recommender systems. It is optimized for large datasets (23M+ ratings), supports GPU acceleration, and can export learned representations (embeddings) directly to Supabase tables for downstream retrieval or inference.

---

## Table of Contents

-  [Project Structure](#project-structure)
-  [Dataset Format](#dataset-format)
-  [Model Description](#model-description)
-  [Supabase Integration](#supabase-integration)
-  [Command Line Usage](#command-line-usage)
-  [Docker & Vertex AI Integration](#docker--vertex-ai-integration)
-  [Model Output](#model-output)
-  [Troubleshooting & Notes](#troubleshooting--notes)
-  [References](#references)

---

### Project Structure

-  `trainer/mf.py` — Main model, training, and data processing code
-  `trainer/requirements.txt` — Python dependencies for the project
-  `trainer/data/ratings.csv` — Ratings file (`userId,movieId,rating`, 23,585,165 records; not included)
-  `Dockerfile` — Build script for Vertex AI/Cloud deployment
-  Supabase — Table(s) for ratings and embedding export

---

### Dataset Format

-  **Path**: `trainer/data/ratings.csv`
-  **Schema**: Comma-separated file, `userId,movieId,rating` (e.g. `194,2278,4.0`)
-  **Size**: 23,585,165 ratings

---

## Model Description

### Matrix Factorization Algorithm

-  Factorizes the user–movie interaction (rating) matrix into:
   -  A user embedding matrix (users × latent factors)
   -  A movie embedding matrix (movies × latent factors)
-  Predicts ratings via:
   -  \( \text{rating}(u, m) \approx \mathbf{p}\_u \cdot \mathbf{q}\_m + b_u + b_m + \mu \)
      -  Where \(\mathbf{p}\_u\) is the vector for user \(u\), \(\mathbf{q}\_m\) is the vector for movie \(m\)
      -  \(b_u\), \(b_m\): learned user/movie biases; \(\mu\): global mean rating
-  Implements dropout regularization and supports GPU acceleration.

#### Neural Architecture

-  PyTorch `nn.Module`
-  User/movie embeddings (`nn.Embedding`)
-  User/movie bias terms
-  Global rating mean bias
-  Optional dropout

#### Training Loop

-  Data split with `scikit-learn`’s `train_test_split`
-  RMSE loss for validation
-  Adam optimizer; gradient clipping available

#### Hyperparameters

-  Batch size
-  Number of latent factors
-  Number of epochs
-  Learning rate and weight decay
-  Dropout rate
-  Gradient clipping threshold

---

## Supabase Integration

-  Imports ratings from a Supabase table; exports learned embeddings to movie/user embedding tables for cross-system compatibility
-  Connect via `--supabaseurl` and `--supabasekey` parameters
-  Table names configurable

---

## Command Line Usage

Example (run inside the `/trainer` directory or via Docker):

python -m mf --ratingscsv data/ratings.csv --valsize 0.1
--batchsize 2048 --factors 64 --epochs 5 --lr 1e-3
--weightdecay 1e-6 --dropout 0.1 --clipgrad 1.0
--usecuda --supabaseurl <SUPABASE_URL> --supabasekey <SUPABASE_KEY>
--importtable ratings --movieexporttable movieembeddings --userexporttable userembeddings

text

| Flag                   | Type  | Default          | Description                         |
| ---------------------- | ----- | ---------------- | ----------------------------------- |
| `--ratings_csv`        | str   | data/ratings.csv | Ratings file location               |
| `--val_size`           | float | 0.1              | Fraction for validation split       |
| `--batch_size`         | int   | 2048             | Training batch size                 |
| `--epochs`             | int   | 1                | Number of training epochs           |
| `--factors`            | int   | 64               | Latent factor dimensionality        |
| `--lr`                 | float | 1e-3             | Learning rate                       |
| `--weight_decay`       | float | 1e-6             | Weight decay L2 regularization      |
| `--dropout`            | float | 0.0              | Embedding dropout rate              |
| `--clip_grad`          | float | None             | Max grad norm for gradient clipping |
| `--use_cuda`           | flag  | off              | Train on GPU if available           |
| `--supabase_url`       | str   | REQUIRED         | Supabase API URL                    |
| `--supabase_key`       | str   | REQUIRED         | Supabase API Key                    |
| `--import_table`       | str   | ratings          | Supabase import table               |
| `--movie_export_table` | str   | movie_embeddings | Supabase export table for movies    |
| `--user_export_table`  | str   | user_embeddings  | Supabase export table for users     |

---

## Docker & Vertex AI Integration

### Containerization for Google Vertex AI

The included Dockerfile is tailored for use with [Vertex AI custom jobs](https://cloud.google.com/vertex-ai) and leverages Google’s official GPU-accelerated PyTorch containers. It ensures reproducibility, simplifies deployment, and enables production-scale cloud training.

#### Dockerfile

Use the official Vertex AI PyTorch GPU container
FROM us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.2-4:latest

Set working directory inside container
WORKDIR /trainer

Copy your trainer code (including data, code, and requirements)
COPY trainer /trainer

Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

(Optional) for deterministic behavior and right time zone:
ENV PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
TZ=Europe/Zagreb

Set the container entrypoint to execute the main module
ENTRYPOINT ["python", "-m", "mf"]

text

#### Directory Structure

-  `/trainer/` — Contains all training code (`mf.py`), `requirements.txt`, and your data subdirectory
-  `data/ratings.csv` — Place in `/trainer/data` inside container

#### requirements.txt

Minimal dependencies:
torch
pandas
numpy
scikit-learn
supabase
argparse

text

#### Local Build and Test

docker build -t matrix-factorization-trainer .
docker run --rm -it matrix-factorization-trainer

text
Optionally, add `--gpus all` if running locally on a machine with a compatible NVIDIA GPU.

#### Vertex AI Job Submission

-  Submit this custom container to Vertex AI using Google Cloud Console, SDK, or Vertex Pipelines
-  Parameterize all command-line arguments as needed; Vertex AI handles GPU/CPU allocation

#### Best Practices

-  All job outputs (embeddings, logs) should be saved to cloud-accessible storage and/or Supabase
-  Use Vertex AI’s orchestration for distributed training or hyperparameter sweeps

---

## Model Output

-  Prints validation RMSE after each epoch
-  Exports user and movie embeddings to Supabase (JSON-style lists)
-  Ready for downstream use (inference, analytics, or other services)

---

## Troubleshooting & Notes

-  Large ratings file: ensure adequate memory and storage resources
-  Confirm correct Python dependencies in `requirements.txt`
-  Validate Supabase keys and access privileges prior to training
-  Ensure ratings file is well-formed; no missing or malformed data
-  To leverage GPU acceleration, only use base containers with CUDA support (as given above)

---

## References

-  Matrix Factorization: d2l.ai, 2021
-  PyTorch Documentation
-  Google Vertex AI Custom Containers
-  Supabase Python Client
-  Best Docker Practices for ML
