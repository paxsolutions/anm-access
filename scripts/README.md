# ANM App Deployment Scripts

This directory contains scripts for deploying the ANM nanny management app to AWS using CDK.

## Deployment Workflow

### Initial Setup (run once)
1. **`setup-ecr.sh`** - Creates ECR repositories and pushes initial Docker images
2. **`deploy-infrastructure.sh`** - Deploys the CDK infrastructure stack

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

## Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed and running
- CDK installed (`npm install -g aws-cdk`)
- Environment variables configured in `../.env`
