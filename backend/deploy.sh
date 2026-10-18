#!/bin/bash
set -e

# ==============================================================================
# KisanWise — Deployment Script
# ──────────────────────────────────────────────────────────────────────────────
# Architecture:
#   Backend  : Vercel Serverless (https://kisanwise-backend.vercel.app)
#   Frontend : Firebase Hosting (https://kisanwise-app.web.app)
#   Database : Neon PostgreSQL / Firestore / Supabase
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PROJECT_ID="kisanwise-app"
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
echo -e "${COLOR_BLUE}         KisanWise Deployment Automation            ${COLOR_NC}"
echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
echo "Project: $PROJECT_ID"
echo ""

ACTION="${1:-help}"
BACKEND_URL="${2:-}"

deploy_backend_vercel() {
  echo -e "\n${COLOR_YELLOW}▶ Deploying Backend to Vercel...${COLOR_NC}"
  cd "$ROOT_DIR/backend"

  if command -v vercel &> /dev/null; then
    VERCEL_CMD="vercel"
  else
    VERCEL_CMD="npx -y vercel"
  fi

  echo "Running Vercel deployment for backend..."
  $VERCEL_CMD --prod

  echo -e "\n${COLOR_GREEN}✔ Backend deployed successfully to Vercel!${COLOR_NC}"
  cd "$ROOT_DIR"
}

deploy_frontend_firebase() {
  echo -e "\n${COLOR_YELLOW}▶ Step 1: Building Frontend...${COLOR_NC}"
  cd "$ROOT_DIR"

  if [ -n "$BACKEND_URL" ]; then
    echo "Setting VITE_API_BASE_URL to $BACKEND_URL"
    VITE_API_BASE_URL="$BACKEND_URL" npm run build
  else
    echo "Using existing .env or default API URL. (To specify backend URL: ./deploy.sh frontend https://your-backend.vercel.app/api)"
    npm run build
  fi

  echo -e "\n${COLOR_YELLOW}▶ Step 2: Deploying Frontend to Firebase Hosting...${COLOR_NC}"
  if command -v firebase &> /dev/null; then
    FIREBASE_CMD="firebase"
  else
    FIREBASE_CMD="npx -y firebase-tools"
  fi

  $FIREBASE_CMD deploy --only hosting --project "$PROJECT_ID"

  echo -e "\n${COLOR_GREEN}✔ Frontend deployed successfully to Firebase Hosting!${COLOR_NC}"
  echo -e "${COLOR_GREEN}  URL: https://${PROJECT_ID}.web.app${COLOR_NC}"
}

case "$ACTION" in
  backend|vercel|backend-vercel)
    deploy_backend_vercel
    ;;
  frontend|firebase|frontend-firebase)
    deploy_frontend_firebase
    ;;
  all)
    deploy_backend_vercel
    deploy_frontend_firebase
    ;;
  *)
    echo "Usage:"
    echo "  ./deploy.sh backend                      # Deploy backend to Vercel"
    echo "  ./deploy.sh frontend                     # Build & deploy frontend to Firebase"
    echo "  ./deploy.sh frontend <BACKEND_API_URL>   # Build with custom backend URL & deploy to Firebase"
    echo "  ./deploy.sh all                          # Deploy both"
    ;;
esac

echo -e "\n${COLOR_BLUE}=====================================================${COLOR_NC}"
echo -e "${COLOR_GREEN}Done!${COLOR_NC}"
echo -e "${COLOR_BLUE}=====================================================${COLOR_NC}"
