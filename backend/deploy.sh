#!/bin/bash
set -e

# ==============================================================================
# KisanWise — GCP Deployment Script
# ──────────────────────────────────────────────────────────────────────────────
# Architecture:
#   Frontend : Firebase Hosting (https://kisanwise-app.web.app) OR Cloud Run
#   Backend  : Google Cloud Run (kisanwise-backend)
#   Database : Firestore (GCP)
#   Project  : kisanwise-app (Region: asia-south1)
# ==============================================================================

PROJECT_ID="kisanwise-app"
REGION="asia-south1"

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
echo -e "${COLOR_BLUE}       KisanWise GCP Deployment Automation          ${COLOR_NC}"
echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
echo "GCP Project: ${PROJECT_ID}"
echo "Region:      ${REGION}"
echo ""

ACTION="${1:-all}"

deploy_frontend_firebase() {
  echo -e "\n${COLOR_YELLOW}▶ Step 1: Building Frontend...${COLOR_NC}"
  npm run build

  echo -e "\n${COLOR_YELLOW}▶ Step 2: Deploying Frontend to Firebase Hosting...${COLOR_NC}"
  # Uses local or npx firebase-tools
  if command -v firebase &> /dev/null; then
    FIREBASE_CMD="firebase"
  else
    FIREBASE_CMD="npx -y firebase-tools"
  fi

  $FIREBASE_CMD deploy --only hosting --project "$PROJECT_ID"

  echo -e "\n${COLOR_GREEN}✔ Frontend deployed successfully to Firebase Hosting!${COLOR_NC}"
  echo -e "${COLOR_GREEN}  URL: https://${PROJECT_ID}.web.app${COLOR_NC}"
}

deploy_backend_cloudrun() {
  echo -e "\n${COLOR_YELLOW}▶ Deploying Backend to Cloud Run...${COLOR_NC}"
  if ! command -v gcloud &> /dev/null; then
    echo -e "${COLOR_YELLOW}Notice: 'gcloud' CLI was not detected in PATH.${COLOR_NC}"
    echo "To deploy the backend to Cloud Run, either:"
    echo "  1. Install gcloud (brew install --cask google-cloud-sdk) and run: ./deploy.sh backend"
    echo "  2. Or use GCP Cloud Build directly by pushing to GitHub or running in Cloud Shell:"
    echo "     gcloud builds submit --config cloudbuild.yaml"
    echo ""
    echo "If you have gcloud in a custom location, export PATH=\"/path/to/google-cloud-sdk/bin:\$PATH\" first."
    return 1
  fi

  echo "Configuring gcloud project ${PROJECT_ID}..."
  gcloud config set project "$PROJECT_ID"

  echo "Submitting build and deploying kisanwise-backend to Cloud Run..."
  gcloud run deploy kisanwise-backend \
    --source ./backend \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --port 3000

  echo -e "\n${COLOR_GREEN}✔ Backend deployed successfully to Cloud Run!${COLOR_NC}"
}

deploy_frontend_cloudrun() {
  echo -e "\n${COLOR_YELLOW}▶ Deploying Frontend to Cloud Run Container...${COLOR_NC}"
  if ! command -v gcloud &> /dev/null; then
    echo -e "${COLOR_YELLOW}Notice: 'gcloud' CLI required for Cloud Run container deployment.${COLOR_NC}"
    return 1
  fi

  gcloud config set project "$PROJECT_ID"
  gcloud run deploy kisanwise-frontend \
    --source . \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080

  echo -e "\n${COLOR_GREEN}✔ Frontend deployed successfully to Cloud Run!${COLOR_NC}"
}

case "$ACTION" in
  frontend|firebase)
    deploy_frontend_firebase
    ;;
  backend|cloudrun)
    deploy_backend_cloudrun
    ;;
  cloudrun-frontend)
    deploy_frontend_cloudrun
    ;;
  all)
    deploy_frontend_firebase
    deploy_backend_cloudrun || true
    ;;
  *)
    echo "Usage: ./deploy.sh [frontend|backend|all|cloudrun-frontend]"
    exit 1
    ;;
esac

echo -e "\n${COLOR_BLUE}=====================================================${COLOR_NC}"
echo -e "${COLOR_GREEN}Deployment script completed.${COLOR_NC}"
echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
