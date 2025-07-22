#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AnmAppStack } from './lib/anm-app-stack';

import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const app = new cdk.App();

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Create the main stack
new AnmAppStack(app, 'AnmAppStack', {
  env,
  description: 'ANM Nanny Management Application Infrastructure',
  tags: {
    Project: 'ANM',
    Environment: 'production',
    ManagedBy: 'CDK'
  }
});
