#!/bin/bash

# Cross-Account S3 Bucket Copy Script
set -e

# Configuration
SOURCE_PROFILE="default"  # AWS profile for source account
DEST_PROFILE="pax"           # AWS profile for destination account (set this)
DEST_REGION="us-east-1"   # Destination region

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 ANM S3 Cross-Account Copy Script${NC}"
echo "=================================================="

# Check if destination profile is set
if [ -z "$DEST_PROFILE" ]; then
    echo -e "${RED}❌ Please set DEST_PROFILE variable in this script${NC}"
    echo "Example: DEST_PROFILE=\"production\""
    exit 1
fi

# Verify AWS profiles exist
echo -e "${YELLOW}🔍 Verifying AWS profiles...${NC}"
if ! aws sts get-caller-identity --profile $SOURCE_PROFILE > /dev/null 2>&1; then
    echo -e "${RED}❌ Source profile '$SOURCE_PROFILE' not configured${NC}"
    exit 1
fi

if ! aws sts get-caller-identity --profile $DEST_PROFILE > /dev/null 2>&1; then
    echo -e "${RED}❌ Destination profile '$DEST_PROFILE' not configured${NC}"
    exit 1
fi

# Get account IDs
SOURCE_ACCOUNT=$(aws sts get-caller-identity --profile $SOURCE_PROFILE --query Account --output text)
DEST_ACCOUNT=$(aws sts get-caller-identity --profile $DEST_PROFILE --query Account --output text)

echo -e "${GREEN}✅ Source Account: $SOURCE_ACCOUNT${NC}"
echo -e "${GREEN}✅ Destination Account: $DEST_ACCOUNT${NC}"

# List of ANM-related buckets to copy
BUCKETS_TO_COPY=(
    "anm-content"
    "anm-media"
    "anm-static"
    "anm-db-backup"
    "anm-kinsta-db-backup"
    "anm-updraft-backup"
    "nanny-data-backup"
)

echo -e "${YELLOW}📋 Buckets to copy:${NC}"
for bucket in "${BUCKETS_TO_COPY[@]}"; do
    echo "  - $bucket"
done

read -p "Continue with copy? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Copy cancelled."
    exit 0
fi

# Copy each bucket
for bucket in "${BUCKETS_TO_COPY[@]}"; do
    echo -e "${YELLOW}🔄 Processing bucket: $bucket${NC}"

    # Check if source bucket exists
    if ! aws s3 ls "s3://$bucket" --profile $SOURCE_PROFILE > /dev/null 2>&1; then
        echo -e "${RED}⚠️  Source bucket '$bucket' not found, skipping...${NC}"
        continue
    fi

    # Create destination bucket if it doesn't exist
    if ! aws s3 ls "s3://$bucket" --profile $DEST_PROFILE > /dev/null 2>&1; then
        echo "  📦 Creating destination bucket..."
        aws s3 mb "s3://$bucket" --profile $DEST_PROFILE --region $DEST_REGION
    fi

    # Get object count for progress
    OBJECT_COUNT=$(aws s3 ls "s3://$bucket" --recursive --profile $SOURCE_PROFILE | wc -l)
    echo "  📊 Objects to copy: $OBJECT_COUNT"

    if [ $OBJECT_COUNT -gt 0 ]; then
        # Perform the sync
        echo "  🚀 Syncing bucket contents..."
        aws s3 sync "s3://$bucket" "s3://$bucket" \
            --source-region us-east-1 \
            --region $DEST_REGION \
            --profile $SOURCE_PROFILE \
            --cli-read-timeout 0 \
            --cli-connect-timeout 60 \
            --endpoint-url-source https://s3.us-east-1.amazonaws.com \
            --endpoint-url https://s3.$DEST_REGION.amazonaws.com \
            --copy-props metadata-directive \
            --delete

        echo -e "${GREEN}  ✅ Completed: $bucket${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Bucket is empty, skipping sync${NC}"
    fi

    echo ""
done

echo -e "${GREEN}🎉 Cross-account S3 copy completed!${NC}"
