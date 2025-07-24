# ANM App Deployment Scripts

This directory contains scripts for deploying and managing the ANM (A Nanny Match) application on AWS.

## Main Deployment Scripts

### `deploy-infrastructure.sh`
Deploys the AWS infrastructure using CDK:
- VPC, subnets, security groups
- RDS MySQL database
- Application Load Balancer with SSL
- ECS cluster and services
- ECR repositories

### `setup-ecr.sh`
Sets up ECR repositories and builds initial Docker images:
- Creates ECR repositories if they don't exist
- Builds and pushes initial backend and frontend images

### `update-images.sh`

Primary script for code updates

- Updates application images and redeploys services:
- Builds new Docker images with latest code (clean build with --no-cache)
- Uses HTTPS URLs for production
- Pushes to ECR
- Forces ECS service redeployment

### `deploy-infrastructure.sh`
deploy-infrastructure.sh
 - Main infrastructure deployment

### `setup-ecr.sh`
setup-ecr.sh
 - Initial ECR setup and image builds

### `update-images.sh`
update-images.sh
 - Primary script for code updates (now always clean builds with HTTPS)

### `deploy-complete.sh`
deploy-complete.sh
 - Complete deployment workflow

### `deploy-new-account.sh`
deploy-new-account.sh
 - New account setup

### `deploy-with-ssl.sh`
deploy-with-ssl.sh
 - SSL-enabled deployment

### `setup-ssl-domain.sh`
setup-ssl-domain.sh
 - SSL certificate setup

## Utility Scripts

### `check-status.sh`
Checks the status of deployed services and infrastructure

### `check-backend-logs.sh`
Retrieves recent backend logs for debugging

### `destroy.sh`
Destroys the entire infrastructure (use with caution)

## Authentication System

The app uses a hybrid authentication system:
- **Token-based auth**: OAuth callback generates secure token in URL redirect
- **MySQL session store**: Replaces MemoryStore for ECS persistence
- **localStorage persistence**: 24-hour client-side storage for page refresh persistence
- **HTTPS enforcement**: All API calls use HTTPS to prevent mixed content errors

## Usage

1. First time deployment:
   ```bash
   ./deploy-infrastructure.sh
   ./setup-ecr.sh
   ```

2. Update application code:
   ```bash
   ./update-images.sh
   ```

3. Check deployment status:
   ```bash
   ./check-status.sh
   ```

4. Debug backend issues:
   ```bash
   ./check-backend-logs.sh
   ```

5. Clean up (destroys everything)
   ```bash
   ./destroy.sh
   ```

## New AWS Account Deployment

To deploy to a new AWS account:

1. **Copy S3 buckets** (if needed):
   ```bash
   # Edit the script to set DEST_PROFILE
   ./copy-s3-cross-account.sh
   ```

2. **Configure environment**:
   ```bash
   # Copy template and update with new account values
   cp ../.env.new-account-template ../.env
   # Edit .env with your new account credentials
   ```

3. **Deploy to new account**:
   ```bash
   ./deploy-new-account.sh
   ```

## Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed and running
- CDK installed (`npm install -g aws-cdk`)
- Environment variables configured in `../.env`
