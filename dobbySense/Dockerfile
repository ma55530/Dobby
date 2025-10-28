# Use the official Vertex AI PyTorch GPU container
FROM us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.2-4:latest

# Set working directory inside container
WORKDIR /trainer

# Copy your trainer code
COPY trainer /trainer

# Install any Python dependencies (Supabase SDK, etc.)
# It's good practice to have a requirements.txt inside /trainer
RUN pip install --no-cache-dir -r requirements.txt

# (Optional) Ensure utf-8 and timezone are set properly
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Europe/Zagreb

# Set the entrypoint to your training module
ENTRYPOINT ["python", "-m", "matrixFactorization"]
