#!/bin/bash

# Deploy ANM App with SSL Certificate and Custom Domain
set -e

echo "🔒 ANM App Deployment with SSL Certificate"
echo "=========================================="
echo "Domain: legacy.paxsolutions.biz"
echo "SSL: AWS Certificate Manager"
echo ""

# Check .env file
if [ ! -f "../.env" ]; then
    echo "❌ .env file not found!"
    echo "Copy .env.new-account-template to .env and update values"
    exit 1
fi

# Load environment
export $(cat ../.env | grep -v '^#' | xargs)
echo "✅ Environment loaded"

# Verify AWS account
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account: $ACCOUNT"

# Check if Route 53 hosted zone exists
echo "🔍 Checking Route 53 hosted zone for paxsolutions.biz..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name paxsolutions.biz --query 'HostedZones[0].Id' --output text 2>/dev/null || echo "None")

if [ "$HOSTED_ZONE_ID" = "None" ] || [ -z "$HOSTED_ZONE_ID" ]; then
    echo "❌ Route 53 hosted zone for paxsolutions.biz not found!"
    echo "Please create a hosted zone for paxsolutions.biz in Route 53 first."
    echo "Or update the domain configuration in the CDK stack."
    exit 1
fi

echo "✅ Found hosted zone: $HOSTED_ZONE_ID"

echo ""
echo "📋 Deployment will:"
echo "1. Create SSL certificate for legacy.paxsolutions.biz"
echo "2. Configure HTTPS listener on ALB"
echo "3. Redirect HTTP to HTTPS"
echo "4. Create Route 53 A record"
echo "5. Update backend to use HTTPS domain"
echo ""

read -p "Continue with SSL deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Deploy infrastructure with SSL
echo "🏗️ Deploying infrastructure with SSL..."
cd ../infrastructure

# Deploy the stack
if command -v cdk > /dev/null 2>&1; then
    cdk deploy --require-approval never
elif command -v npx > /dev/null 2>&1; then
    npx cdk deploy --require-approval never
else
    echo "❌ CDK not found. Please install with: npm install -g aws-cdk"
    exit 1
fi

cd ../scripts

# Get deployment outputs
echo "📊 Getting deployment information..."
DOMAIN_NAME=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query 'Stacks[0].Outputs[?OutputKey==`DomainName`].OutputValue' --output text)
APP_URL=$(aws cloudformation describe-stacks --stack-name AnmAppStack --query 'Stacks[0].Outputs[?OutputKey==`ApplicationUrl`].OutputValue' --output text)

echo ""
echo "🎉 SSL Deployment Complete!"
echo "=========================="
echo "✅ Domain: $DOMAIN_NAME"
echo "✅ Application URL: $APP_URL"
echo "✅ SSL Certificate: Automatically validated via DNS"
echo "✅ HTTP → HTTPS Redirect: Enabled"
echo ""
echo "Note: SSL certificate validation may take a few minutes."
echo "The application will be available once validation completes."
