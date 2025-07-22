#!/bin/bash

# ANM App ECR Setup Script
# Creates ECR repositories and pushes initial images
set -e

echo "📦 Setting up ECR repositories and pushing images..."

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found. Please create one with your configuration."
    exit 1
fi

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "📋 ECR Setup Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   AWS Region: $AWS_REGION"

# Create ECR repositories
echo "🏗️ Creating ECR repositories..."

# Create backend repository
aws ecr create-repository --repository-name anm-backend --region $AWS_REGION || echo "Backend repository may already exist"

# Create frontend repository
aws ecr create-repository --repository-name anm-frontend --region $AWS_REGION || echo "Frontend repository may already exist"

# Set repository URIs
BACKEND_REPO_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/anm-backend"
FRONTEND_REPO_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/anm-frontend"

echo "Backend ECR: $BACKEND_REPO_URI"
echo "Frontend ECR: $FRONTEND_REPO_URI"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend image
echo "🔨 Building backend image..."
cd ../backend
docker build -t anm-backend .
docker tag anm-backend:latest $BACKEND_REPO_URI:latest

echo "📤 Pushing backend image to ECR..."
docker push $BACKEND_REPO_URI:latest

# Build and push frontend image
echo "🔨 Building frontend image..."
cd ../frontend
docker build -t anm-frontend .
docker tag anm-frontend:latest $FRONTEND_REPO_URI:latest

echo "📤 Pushing frontend image to ECR..."
docker push $FRONTEND_REPO_URI:latest

echo "✅ ECR setup completed successfully!"
echo ""
echo "📋 Repository URIs:"
echo "   Backend: $BACKEND_REPO_URI"
echo "   Frontend: $FRONTEND_REPO_URI"
echo ""
echo "🚀 Now you can deploy the full infrastructure using ./deploy-infrastructure.sh"
