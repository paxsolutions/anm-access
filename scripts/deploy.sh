#!/bin/bash

# ANM App Deployment Script
set -e

echo "🚀 Starting ANM App deployment..."

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found. Please create one with your configuration."
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "📋 Deployment Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   AWS Region: $AWS_REGION"
echo "   S3 Bucket: $S3_BUCKET_NAME"

# Build and push Docker images
echo "🐳 Building and pushing Docker images..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build backend image
echo "🔨 Building backend image..."
cd ../backend
docker build -t anm-backend .
docker tag anm-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/anm-backend:latest

# Build frontend image
echo "🔨 Building frontend image..."
cd ../frontend
docker build -t anm-frontend .
docker tag anm-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/anm-frontend:latest

# Deploy CDK infrastructure
echo "🏗️ Deploying CDK infrastructure..."
cd ../infrastructure

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing CDK dependencies..."
    npm install
fi

# Bootstrap CDK if needed
echo "🎯 Bootstrapping CDK..."
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION

# Deploy the stack
echo "🚀 Deploying infrastructure..."
npx cdk deploy --require-approval never

# Get ECR repository URIs from CDK outputs
BACKEND_REPO_URI=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query "Stacks[0].Outputs[?OutputKey=='BackendRepositoryUri'].OutputValue" --output text --region $AWS_REGION)
FRONTEND_REPO_URI=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" --output text --region $AWS_REGION)

# Push images to ECR
echo "📤 Pushing backend image to ECR..."
docker push $BACKEND_REPO_URI:latest

echo "📤 Pushing frontend image to ECR..."
docker push $FRONTEND_REPO_URI:latest

# Update ECS services to use new images
echo "🔄 Updating ECS services..."
aws ecs update-service --cluster anm-cluster --service anm-backend --force-new-deployment --region $AWS_REGION
aws ecs update-service --cluster anm-cluster --service anm-frontend --force-new-deployment --region $AWS_REGION

# Get load balancer DNS
ALB_DNS=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" --output text --region $AWS_REGION)

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your application is available at: http://$ALB_DNS"
echo "📊 Monitor your services in the AWS Console:"
echo "   - ECS Cluster: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/anm-cluster"
echo "   - RDS Database: https://console.aws.amazon.com/rds/home?region=$AWS_REGION"
echo "   - Load Balancer: https://console.aws.amazon.com/ec2/v2/home?region=$AWS_REGION#LoadBalancers"
echo ""
echo "⏰ Note: It may take a few minutes for the services to become healthy."
