
# DobbySense: Advanced Hybrid Recommender System

**DobbySense** is the algorithmic heart of the Dobby platform. It is a sophisticated recommendation engine built on PyTorch that moves beyond simple Collaborative Filtering by integrating content-based features (Genres) directly into the latent factor learning process. This hybrid approach solves the classic "Cold Start" problem while maintaining the high accuracy of Matrix Factorization.

---

## 1. Mathematical Foundation

### 1.1 Standard Matrix Factorization (The Baseline)

At its core, DobbySense builds upon Probabilistic Matrix Factorization (PMF). In a standard MF model, we approximate the rating matrix $R$ as the product of two lower-rank matrices: User Factors $P$ and Item Factors $Q$.

The predicted rating $\hat{r}_{ui}$ for user $u$ and item $i$ is given by:

$$ \hat{r}_{ui} = \mathbf{p}_u \cdot \mathbf{q}_i + b_u + b_i + \mu $$

Where:

- $\mathbf{p}_u \in \mathbb{R}^k$: Latent vector for user $u$.
- $\mathbf{q}_i \in \mathbb{R}^k$: Latent vector for item $i$.
- $b_u, b_i$: Bias terms for user and item (capturing individual tendencies, e.g., a harsh critic or a universally acclaimed movie).
- $\mu$: Global average rating.
- $k$: The number of latent factors (Dimension of the embedding space).

### 1.2 The Hybrid Extension (Genre-Aware Embeddings)

Standard MF fails when an item has few ratings (item cold start) or when we want to capture semantic relationships explicitly. DobbySense introduces a **Genre Projector Layer**.

We represent the genres of movie $i$ as a multi-hot vector $\mathbf{g}_i \in \{0,1\}^N$, where $N$ is the number of total genres. The model learns a linear transformation to map these discrete logical features into the continuous latent space of the model.

Let $f_{genre}(\cdot)$ be our learned linear mapping:
$$ f_{genre}(\mathbf{x}) = \mathbf{W}_g \mathbf{x} + \mathbf{b}_g $$

The model modifies the effective item representation used for prediction. The effective item vector $\mathbf{q}'_i$ becomes a weighted sum of its unique identity vector and its semantic content vector:

$$ \mathbf{q}'_i = \mathbf{q}_i + \lambda \cdot f_{genre}(\mathbf{g}_i) $$

Substituting this back into the prediction equation:

$$ \hat{r}_{ui} = \mathbf{p}_u \cdot \left( \mathbf{q}_i + \lambda (\mathbf{W}_g \mathbf{g}_i + \mathbf{b}_g) \right) + b_u + b_i + \mu $$

- $\mathbf{W}_g$: A learnable weight matrix of shape $(k \times N)$ representing genre embeddings.
- $\lambda$: A hyperparameter (`GENRE_WEIGHT`) controlling how much genres influence the recommendation versus pure user behavior.

---

## 2. Neural Network Architecture

The system is implemented as a PyTorch `nn.Module` (`HybridMatrixFactorization`) with the following components:

1. **User Embedding Layer**: `nn.Embedding(num_users, latent_dim)`
	- Learns a specialized vector for every known user ID.
2. **Movie Identity Layer**: `nn.Embedding(num_movies, latent_dim)`
	- Learns unique characteristics of a movie that _aren't_ explained by its genres (e.g., acting quality, direction style).
3. **Genre Projection Layer**: `nn.Linear(num_genres, latent_dim)`
	- Learns what "Action" or "Romance" looks like in the abstract vector space.
4. **Bias Layers**:
	- User and Movie biases are learned as scalar embeddings (`latent_dim=1`).
5. **Regularization**:
	- **Dropout**: Applied to user and item vectors during training to prevent overfitting.
	- **L2 Regularization** (Weight Decay): Applied via the Adam optimizer to constrain the magnitude of the latent vectors.

---

## 3. The "Fold-In" Algorithm (Solving User Cold Start)

A critical limitation of Matrix Factorization is that it cannot make predictions for a user who has never rated anything ($\mathbf{p}_u$ is unlearned). DobbySense solves this with an algebraic **Fold-In** technique.

### 3.1 Concept

Since we have learned a mapping between **Genres** and the **Latent Space** ($\mathbf{W}_g$), we can reverse-engineer a user vector for a new user based on their stated preferences.

If a new user selects "Sci-Fi" and "Thriller" during onboarding, we don't need to retrain the model. We can synthesize their vector immediately.

### 3.2 The Algorithm

1. **Export**: The trained Genre Layer weights $\mathbf{W}_g$ and bias $\mathbf{b}_g$ are exported to the database.
2. **User Input**: User selects a set of preferred genres $S_{prefs}$.
3. **Synthesis**: We calculate the "Center of Gravity" for those genres in the latent space.

$$ \mathbf{p}_{new} \approx \frac{1}{|S_{prefs}|} \sum_{j \in S_{prefs}} (\mathbf{W}_{g}[:, j] + \mathbf{b}_g) $$

This synthesized vector $\mathbf{p}_{new}$ is mathematically compatible with all existing movie vectors $\mathbf{q}'_i$. We can immediately perform Cosine Similarity searches to generate recommendations:

$$ \text{Score}(u_{new}, i) = \cos(\mathbf{p}_{new}, \mathbf{q}'_i) $$

This allows Dobby to provide highly personalized recommendations **milliseconds** after account creation.

### 3.3 TV Show Embeddings (Pure Content-Based Fold-In)

While movies have millions of user ratings allowing us to learn their identity vectors ($\mathbf{q}_i$), **TV Shows** in our dataset often lack sufficient interaction data for full collaborative filtering. To generate embeddings for TV shows, we treat them as "Cold Start Items" and use a projection technique similar to the User Fold-In.

1.  **Genre Extraction**: For every show in `shows.csv`, we construct its multi-hot genre vector $\mathbf{g}_{show}$.
2.  **Projection**: We pass this vector through the **already trained** Genre Layer ($\mathbf{W}_g$) to project the show into the same latent space as the movies.
    $$ \mathbf{q}_{show} = \lambda \cdot (\mathbf{W}_g \mathbf{g}_{show} + \mathbf{b}_g) $$
3.  **Result**: This creates a vector representation for every TV show that is mathematically compatible with user vectors. A user who likes "Sci-Fi Movies" will vector-match with "Sci-Fi Shows" purely because the model understands what "Sci-Fi" implies in the latent space.

---

## 4. Training Pipeline

The training process is orchestrated via Jupyter Notebooks (`matrixFactorization.ipynb`) rather than scripts, allowing for interactive analysis and visualization.

### 4.1 Datasets

The model is trained on a massive merge of movie and TV show data:

1. **The Movies Dataset (Kaggle)**:
	- Source: [Rounak Banik on Kaggle](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset)
	- Content: Metadata and **26M+ ratings** from 270,000 users for all movies listed in the Full MovieLens Dataset. This provides the deep historical behavior data needed for collaborative filtering.

2. **Full TMDB TV Shows Dataset (Kaggle)**:
	- Source: [Asaniczka on Kaggle](https://www.kaggle.com/datasets/asaniczka/full-tmdb-tv-shows-dataset-2023-150k-shows/data)
	- Content: Comprehensive metadata for over 150,000 TV shows. This allows Dobby to recommend shows alongside movies using the same genre-based vector space.

3. **Dynamic Data**: Real-time user ratings fetched from Supabase (`movie_ratings` table) are merged with the Kaggle data at training time, ensuring the model adapts to current Dobby users.

### 4.2 Hyperparameters Explained

| Parameter            | Default  | Explanation                                                                                                                                                                                                                    |
| :------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `N_FACTORS`          | **64**   | The size of the embedding vector (e.g., length of the array representing a user/movie). Higher = more nuance, but harder to train and more memory. 64 is a sweet spot for 20M ratings.                                         |
| `EPOCHS`             | **5**    | How many times the model sees the entire dataset. Since we have 26M ratings, 5 epochs is sufficient for convergence without overfitting.                                                                                       |
| `LEARNING_RATE`      | **1e-3** | The step size for the Adam optimizer. 0.001 is standard for Adam; too high = diverge, too low = slow training.                                                                                                                 |
| `BATCH_SIZE`         | **2048** | Number of rating samples processed at once. Large batch sizes (2048+) are crucial for GPU efficiency.                                                                                                                          |
| `GENRE_WEIGHT` (`λ`) | **0.5**  | **Critical Hybrid Parameter**. Controls how much "Genre" matters vs. "Specific Movie Identity". <br>• If 0.0: Pure Collaborative Filtering (ignores genres). <br>• If 1.0: Strong genre smoothing (good for cold start items). |
| `MODEL_DROPOUT`      | **0.1**  | Randomly zeroes out 10% of the embedding elements during training. This forces the model to learn robust representations and prevents memorizing the training data.                                                            |
| `WEIGHT_DECAY`       | **1e-6** | L2 Regularization. Adds a penalty for large weights, encouraging simpler models and preventing "exploding" embeddings.                                                                                                         |
| `CLIP_GRAD_NORM`     | **None** | Gradient Clipping threshold. If set (e.g., `1.0`), limits the maximum size of parameter updates to prevent instability during training bursts.                                                                                 |
| `EMBEDDING_INIT_STD` | **0.01** | The standard deviation for the normal distribution used to initialize the embedding matrices. Small random values are crucial for breaking symmetry at the start of learning.                                                  |
| `TEST_SIZE`          | **0.0**  | Percentage of data held back for validation. Set to **0.0** for production training to use maximal data for the best final model.                                                                                              |
| `RANDOM_STATE`       | **42**   | A fixed seed for the random number generator, ensuring that data splitting and weight initialization are reproducible across runs.                                                                                             |
| `CHUNK_SIZE`         | **500**  | The number of records sent to Supabase in a single batch insert. Tuned to avoid HTTP 500/Timeout errors during the export phase.                                                                                               |

### 4.3 Training Strategy

1. **Data Ingestion**: Load CSVs from GCS + Fetch Supabase table.
2. **Preprocessing**:
	- **Re-indexing**: Maps raw user/movie IDs to continuous 0..N integers. This is crucial for embedding lookup efficiency.
	- **Multi-Hot Encoding**: Converts raw genre strings (e.g., "Action|Sci-Fi") into a binary matrix where each column represents a genre.
	- **Alignment**: Ensures that the `genre_matrix` is perfectly aligned with the `movie_idx` used in the PyTorch model.
3. **Training**: Run Adam optimizer on `MSELoss`.
4. **Export**: Save artifacts to Supabase.

---

## 5. Inference & Recommendation Engine (Serving Phase)

Once the model has finished training and exported the embeddings to Supabase, the **Next.js** application takes over. The serving phase isn't just a simple database query; it is a multi-stage pipeline designed to balance mathematical relevance with human quality standards.

### 5.1 The Vector Search Strategy

Since both Users and Movies now inhabit the same 64-dimensional latent space, the relevance of a movie $m$ to a user $u$ is the cosine of the angle between their vectors:

$$ \text{Similarity}(u, m) = \frac{\mathbf{u} \cdot \mathbf{m}}{\|\mathbf{u}\| \|\mathbf{m}\|} $$

The system calls a PostgreSQL RPC function (`get_top_movies_for_user`) which performs a fast approximate nearest neighbor search (ANN) using the `pgvector` extension.

- **Input**: User Embedding Vector (fetched or computed via Fold-In).
- **Process**: Index scan on the `vectors` column.
- **Output**: Top $K$ raw ID candidates (e.g., top 20 movies) closest to the user's taste.


### 5.2 The FBS (Find Better Similar) Algorithm

A common issue with pure Collaborative Filtering is that it may recommend "mathematically correct" but "qualitatively poor" items. For example, it might recommend a C-grade Sci-Fi movie simply because it has the perfect vector coordinates for a Sci-Fi fan.

To solve this, DobbySense uses the **FBS Algorithm** (`Filter` & `Better-Similar`) defined in `fbs.functions.ts`.

#### Step A: Quality Filtering (`Filter`)

Every candidate item is passed through a heuristic filter (`isBadMovie` / `isBadShow`) that checks against a configuration config (e.g., `minVoteAverage`, `minYear`).

An item is flagged as **"Bad"** if:

1. **Low Rating**: `vote_average` < `minVoteAverage` (e.g., 5.0).
2. **Too Old**: `year` < `minYear` (e.g., 1980).
3. **Mid-Tier Trap**: `vote_average` < `midTierRating` **AND** `year` <= `midTierYear`.
	- _Rationale_: Older movies (e.g., from 1990) are acceptable if they are classics (high rating), but mediocre old movies are usually irrelevant to modern users.

#### Step B: Smart Replacement (`Better-Similar`)

Instead of simply discarding a "Bad" item (which would shrink the recommendation list), the system attempts to **upgrade** it.

1. **Fetch Similar**: The system queries TMDB for items similar to the "Bad" candidate.
2. **Filter & Sort**: The similar items are themselves filtered (removing bad ones) and sorted by **Popularity**.
3. **Stochastic Selection**: We pick a random item from the **Top 5** best alternatives.
	- _Why Top 5?_ Picking #1 every time reduces variety. Randomness ensures the feed feels fresh.

### 5.3 Fuzzy Logic Layer: Cold Start & Ranking

To further improve recommendation quality—especially for new users or users with sparse history—DobbySense incorporates a fuzzy logic layer for ranking and cold start scenarios.

#### Fuzzy Membership Functions

For both genre match ratio and popularity, fuzzy membership functions are used to assign a degree of membership to three categories: low, mid, and high. For a value $x$ in $[0,1]$:

- **Low**: $1$ if $x \leq 0.2$, linearly decreasing to $0$ at $x=0.5$
- **Mid**: $0$ if $x \leq 0.2$, peaks at $x=0.5$, $0$ again at $x=0.8$
- **High**: $0$ if $x \leq 0.5$, linearly increasing to $1$ at $x=0.8$

#### Fuzzy Inference and Scoring

A 3x3 rule matrix combines genre and popularity memberships to produce a fuzzy score:

- High genre & High popularity: 1.0 (Excellent)
- High genre & Mid popularity: 0.9 (Very Good)
- Mid genre & High popularity: 0.8 (Good)
- Mid genre & Mid popularity: 0.6 (Okay)
- High genre & Low popularity: 0.5 (Hidden gem)
- Low genre & High popularity: 0.4 (Fair)
- Mid genre & Low popularity: 0.3 (Poor)
- Low genre & Mid popularity: 0.2 (Very Poor)
- Low genre & Low popularity: 0.1 (Lowest priority)

The final fuzzy score is a weighted sum of all rule outputs, normalized by the sum of rule weights.

#### Application in Ranking

- **For users with genre preferences but little/no rating history (cold start):**
  - The fuzzy score is weighted heavily (e.g., 85%) in the final ranking, with a small base score for list position.
- **For users with rating history:**
  - The fuzzy score is blended with the embedding-based rank and a small random jitter for diversity.

This approach ensures that recommendations are both mathematically relevant and intuitively appealing, even for new users.


### 5.4 Pipeline Execution Flow

The DobbySense recommendation pipeline consists of three main stages, executed in order:

**1. Embedding-based Candidate Selection**
	- Retrieve top candidate movies and shows for the user using vector search in the shared embedding space (via `get_top_movies_for_user` and `get_top_shows_for_user`).

**2. FBS (Filter, Better-Similar) Post-Processing**
	- Remove or upgrade low-quality items using the FBS algorithm: filter out "bad" candidates and, where possible, replace them with better, similar alternatives.

**3. Fuzzy Logic Scoring and Ranking**
	- Apply fuzzy logic to score and rank the remaining candidates, taking into account genre match, popularity, and user preferences. This ensures recommendations are both mathematically relevant and intuitively appealing, especially for new or cold-start users.

**Summary Flow:**

```
Embeddings (vector search)
	↓
FBS (Filter, Better-Similar)
	↓
Fuzzy Logic Scoring & Ranking
```

This logic lives in valid Next.js API routes (e.g., `api/recommendation-engine`):

1. **Trigger**: User opens "For You" page (`/home`).
2. **Check Cache**: System checks `movie_recommendations` table for fresh ( < 24h old) rows.
3. **Compute**: If cache miss:
	- Calculate Vector Logic (`get_top_movies_for_user`).
	- Run **FBS Post-Processing** (Javascript Layer).
	- Apply fuzzy logic scoring and ranking.
	- Fetch metadata for final list.
4. **Cache & Return**: Result is saved to `movie_recommendations` and returned to UI.

---

## 6. Implementation & Deployment (MLOps)

DobbySense utilizes a serverless, containerized MLOps pipeline hosted on **Google Cloud Platform (GCP)**. The architecture is designed for "Set and Forget" automation, ensuring the model is constantly retrained on newly generated user data without manual intervention.

### 6.1 Cloud Architecture (Vertex AI)

The deployment strategy leverages Google's managed AI services to handle the heavy lifting of GPU provisioning and container orchestration.

1. **Container Registry (Artifact Registry)**:
   - We do not run training scripts directly on a VM. Instead, the entire training environment (code, dependencies, configuration) is packaged into a Docker image defined in `Dockerfile`.
   - These images are versioned and stored in GCP Artifact Registry.
   - **Base Image**: We utilize the official `vertex-ai/training/pytorch-gpu` container to leverage pre-optimized CUDA drivers and PyTorch binaries.

2. **Compute Engine (Vertex AI Training)**:
   - The actual model training occurs on **Vertex AI Custom Jobs**.
   - **Hardware**: The pipeline dynamically provisions `n1-standard-4` instances attached with **NVIDIA Tesla T4 GPUs**. This provides the necessary CUDA acceleration for the matrix factorization operations.
   - **Ephemeral**: Resources are provisioned only for the duration of the training (typically 10-15 minutes) and then destroyed immediately, optimizing cloud costs.

3. **Orchestration (Cloud Scheduler)**:
   - A cron job defined in Cloud Scheduler triggers the Vertex AI pipeline every day (configured for `15:00` in the script).
   - This ensures the model incorporates the latest ratings from the last 24 hours (fetched from Supabase) into the daily build.

### 6.2 The Deployment Script (`deploy_and_train.ps1`)

The entire infrastructure setup and code deployment is automated via a PowerShell script. This "Infrastructure as Code" approach handles:

1. **API Enablement**: Automatically enables required GCP services (AI Platform, Artifact Registry, Cloud Build).
2. **Image Build**: Submits the build context to Google Cloud Build, which creates the Docker image and pushes it to the registry.
3. **Job Submission**: Immediately triggers a "One-Off" test run to verify the code works in the remote environment.
4. **Schedule Update**: Creates or updates the Cloud Scheduler cron job to point to the newly built image version.

### 6.3 Replication Guide (How to Deploy)

To deploy your own instance of the DobbySense trainer, follow these steps:

#### Prerequisites

1. **GCP Project**: Create a project in Google Cloud Console.
2. **Google Cloud SDK**: Install the `gcloud` CLI and authenticate via `gcloud auth login`.
3. **Quotas**: Ensure your project has a quota for `NVIDIA_TESLA_T4` GPUs in your target region (e.g., `us-central1`).
4. **GCS Bucket**: Create a Google Cloud Storage bucket and upload your CSV datasets (`ratings.csv`, `movies.csv`, `shows.csv`).

#### Configuration (Required)

You must manually update the placeholders in the codebase with your specific project details before running any scripts.

**1. Deployment Script (`deploy_and_train.ps1`)**
Update top-level variables and secrets:

```powershell
$PROJECT_ID   = "your-gcp-project-id"
$REGION       = "us-central1"
$REPO_NAME    = "dobby-models"
$SUPABASE_URL = "your-supabase-url"
$SUPABASE_KEY = "your-service-role-key"
```

**2. Training Script (`trainer/matrixFactorization.py`)**
Update GCS paths (ensure these match where you uploaded your CSVs):

```python
RATINGS_PATH = os.environ.get("RATINGS_PATH", "gs://your-bucket/ratings.csv")
MOVIES_PATH  = os.environ.get("MOVIES_PATH", "gs://your-bucket/movies.csv")
SHOWS_PATH   = os.environ.get("SHOWS_PATH", "gs://your-bucket/shows.csv")
```

**3. Notebook (`trainer/matrixFactorization.ipynb`)**
If running interactively (Colab/local), update the configuration block:

```python
RATINGS_PATH = "gs://your-bucket/ratings.csv"
SUPABASE_URL = "your-supabase-url"
SUPABASE_KEY = "your-service-role-key"
```

#### Execution

Run the script from a PowerShell terminal within the `dobbySense` directory:

```powershell
.\deploy_and_train.ps1
```

**What happens next?**

1. The script will build your Docker image from the `Dockerfile`.
2. It uploads the image to your GCP project.
3. It spins up a T4 GPU instance on Vertex AI to run the first training session.
4. It registers a daily schedule to repeat this process automatically.

---

## 7. References & Further Reading

- Koren, Y., Bell, R., & Volinsky, C. (2009). Matrix factorization techniques for recommender systems.
- He, X., et al. (2017). Neural Collaborative Filtering.
- PyTorch `nn.Embedding` documentation.
