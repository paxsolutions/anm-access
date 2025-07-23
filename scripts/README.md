# ANM App Deployment Scripts

This directory contains scripts for deploying the ANM nanny management app to AWS using CDK.

## Deployment Workflow

### Initial Setup (run once)
1. **`setup-ecr.sh`** - Creates ECR repositories and pushes initial Docker images
2. **`deploy-infrastructure.sh`** - Deploys the CDK infrastructure stack

### SSL/Domain Deployment
- **`deploy-with-ssl.sh`** - Deploy with custom domain and SSL certificate

### Regular Updates
- **`update-images.sh`** - Updates Docker images and redeploys ECS services (for code changes)

### Monitoring & Management
- **`check-status.sh`** - Checks ECS services status and health
- **`destroy.sh`** - Destroys the entire infrastructure (use with caution)

## Usage Examples

```bash
# Initial deployment
./setup-ecr.sh
./deploy-infrastructure.sh

# Update application code
./update-images.sh

# Check deployment status
./check-status.sh

# Clean up (destroys everything)
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
