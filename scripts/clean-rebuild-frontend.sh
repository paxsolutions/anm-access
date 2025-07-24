#!/bin/bash

# Clean Rebuild Frontend with HTTPS
set -e

echo "🧹 Clean Frontend Rebuild"
echo "========================"

# Load environment
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

CUSTOM_DOMAIN="legacy.paxsolutions.biz"
API_URL="https://$CUSTOM_DOMAIN"

# Get ECR repo
FRONTEND_REPO_URI=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" --output text --region $AWS_REGION)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(echo $FRONTEND_REPO_URI | cut -d'/' -f1)

# Clean build with no cache
echo "🔨 Clean building frontend with HTTPS..."
cd ../frontend
docker build --no-cache --build-arg REACT_APP_API_URL=$API_URL -t anm-frontend .
docker tag anm-frontend:latest $FRONTEND_REPO_URI:latest

# Push and update
echo "📤 Pushing to ECR..."
docker push $FRONTEND_REPO_URI:latest

echo "🔄 Updating ECS service..."
aws ecs update-service --cluster anm-cluster --service anm-frontend --force-new-deployment --region $AWS_REGION

echo "✅ Clean rebuild complete!"
