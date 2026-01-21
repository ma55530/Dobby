# Use the official Vertex AI PyTorch Training container (better for custom jobs than prediction)
FROM us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-1.py310:latest

# Set working directory inside container
WORKDIR /trainer

# Copy your trainer code
COPY trainer/ .

# Install any Python dependencies (Supabase SDK, etc.)
# It's good practice to have a requirements.txt inside /trainer
RUN pip install --no-cache-dir -r requirements.txt

# (Optional) Ensure utf-8 and timezone are set properly
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Europe/Zagreb

# Set the entrypoint to your training module
CMD ["python", "matrixFactorization.py"]
