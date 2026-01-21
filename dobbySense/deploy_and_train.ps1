$ErrorActionPreference = "Stop"

# --- Configuration ---
$PROJECT_ID = "your-gcp-project-id"
$REGION = "us-central1"  # Changed to us-central1 to avoid quota issues in europe-west1
$REPO_NAME = "dobby-models"
$IMAGE_NAME = "dobby-trainer"
$TAG = "latest"
$IMAGE_URI = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME`:$TAG"
$SCHEDULE_CRON = "0 15 * * *" # Runs every day at 03:00 PM

# --- Secrets (Extracted from notebook history) ---
# NOTE: In a real production environment, use Google Secret Manager.
$SUPABASE_URL = "your-supabase-url"
$SUPABASE_KEY = "your-supabase-service-role-key"

Write-Host "----------------------------------------------------------------"
Write-Host "Deploying DobbySense Trainer to Vertex AI"
Write-Host "Project: $PROJECT_ID"
Write-Host "Region:  $REGION"
Write-Host "Image:   $IMAGE_URI"
Write-Host "----------------------------------------------------------------"

# 1. Configure Project
Write-Host "`n[1/5] Configuring gcloud project..."
gcloud config set project $PROJECT_ID

# 2. Enable APIs
Write-Host "`n[2/5] Enabling necessary Google Cloud APIs..."
gcloud services enable artifactregistry.googleapis.com aiplatform.googleapis.com cloudbuild.googleapis.com

# 3. Create Repository
Write-Host "`n[3/5] Checking/Creating Artifact Registry repository..."
# Temporarily relax error action to allow checking for non-existence
$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

gcloud artifacts repositories describe $REPO_NAME --location=$REGION --project=$PROJECT_ID 2>&1 | Out-Null
$repoExists = $LASTEXITCODE -eq 0

$ErrorActionPreference = $oldErrorAction

if (-not $repoExists) {
    Write-Host "Creating repository '$REPO_NAME'..."
    gcloud artifacts repositories create $REPO_NAME `
        --repository-format=docker `
        --location=$REGION `
        --description="Dobby Machine Learning Models"
} else {
    Write-Host "Repository '$REPO_NAME' already exists."
}

# 4. Build & Push
Write-Host "`n[4/5] Building and Pushing Docker image..."
# Must be built from the directory containing Dockerfile
gcloud builds submit --tag $IMAGE_URI .

# 5. Submit Vertex AI Job
Write-Host "`n[5/6] Submitting ONE-OFF manual training job (Test Run)..."
$JOB_NAME = "dobby-training-$(Get-Date -Format 'yyyyMMdd-HHmm')"

# Create config file for custom job with env vars
$manualJobConfig = @"
workerPoolSpecs:
  - machineSpec:
      machineType: n1-standard-4
      acceleratorType: NVIDIA_TESLA_T4
      acceleratorCount: 1
    replicaCount: 1
    containerSpec:
      imageUri: $IMAGE_URI
      command: ["/bin/sh", "-c", "python matrixFactorization.py"]
      env:
        - name: SUPABASE_URL
          value: $SUPABASE_URL
        - name: SUPABASE_KEY
          value: $SUPABASE_KEY
"@
Set-Content -Path "manual_job_config.yaml" -Value $manualJobConfig -Encoding UTF8

gcloud ai custom-jobs create `
    --region=$REGION `
    --display-name=$JOB_NAME `
    --config="manual_job_config.yaml"

if ($LASTEXITCODE -ne 0) {
    Remove-Item "manual_job_config.yaml"
    Write-Error "Failed to submit Vertex AI Job. Check quota or permissions."
}

Remove-Item "manual_job_config.yaml"

# 6. Create Recurring Schedule
Write-Host "`n[6/6] Creating/Updating DAILY Schedule (3 PM)..."
$SCHEDULER_JOB_NAME = "dobby-daily-retrain"

# Get Service Account (Required for Scheduler to trigger Vertex AI)
$PROJECT_NUM = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUM-compute@developer.gserviceaccount.com"
Write-Host "      Using Service Account: $SERVICE_ACCOUNT"
gcloud services enable cloudscheduler.googleapis.com

# Construct JSON Payload for Vertex AI API
$jobBody = @{
    displayName = "dobby-scheduled-job"
    jobSpec = @{
        workerPoolSpecs = @(
            @{
                machineSpec = @{
                    machineType = "n1-standard-4"
                    acceleratorType = "NVIDIA_TESLA_T4"
                    acceleratorCount = 1
                }
                replicaCount = 1
                containerSpec = @{
                    imageUri = $IMAGE_URI
                    command = @("/bin/sh", "-c", "python matrixFactorization.py")
                    env = @(
                        @{ name = "SUPABASE_URL"; value = $SUPABASE_URL },
                        @{ name = "SUPABASE_KEY"; value = $SUPABASE_KEY }
                    )
                }
            }
        )
    }
} | ConvertTo-Json -Depth 10
Set-Content -Path "job_payload.json" -Value $jobBody

# Check if schedule exists to decide update vs create
$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

gcloud scheduler jobs describe $SCHEDULER_JOB_NAME --location=$REGION 2>&1 | Out-Null
$jobExists = $LASTEXITCODE -eq 0

$ErrorActionPreference = $oldErrorAction

if ($jobExists) {
    Write-Host "      Updating existing schedule..."
    gcloud scheduler jobs update http $SCHEDULER_JOB_NAME `
        --location=$REGION `
        --schedule=$SCHEDULE_CRON `
        --uri="https://$REGION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/customJobs" `
        --message-body-from-file="job_payload.json" `
        --oauth-service-account-email=$SERVICE_ACCOUNT `
        --update-headers="Content-Type=application/json"
} else {
    Write-Host "      Creating NEW schedule..."
    gcloud scheduler jobs create http $SCHEDULER_JOB_NAME `
        --location=$REGION `
        --schedule=$SCHEDULE_CRON `
        --uri="https://$REGION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/customJobs" `
        --message-body-from-file="job_payload.json" `
        --oauth-service-account-email=$SERVICE_ACCOUNT `
        --headers="Content-Type=application/json"
}

# Cleanup
Remove-Item "job_payload.json"

Write-Host "----------------------------------------------------------------"
Write-Host "SUCCESS!"
Write-Host "1. Immediate Manual Job submitted."
Write-Host "2. Schedule '$SCHEDULER_JOB_NAME' active ($SCHEDULE_CRON)."
Write-Host "View Jobs: https://console.cloud.google.com/vertex-ai/training/custom-jobs?project=$PROJECT_ID"
Write-Host "----------------------------------------------------------------"
