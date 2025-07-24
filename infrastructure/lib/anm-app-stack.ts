import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export class AnmAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'AnmVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Reference existing ECR repositories
    const backendRepo = ecr.Repository.fromRepositoryName(this, 'AnmBackendRepo', 'anm-backend');
    const frontendRepo = ecr.Repository.fromRepositoryName(this, 'AnmFrontendRepo', 'anm-frontend');

    // Create database credentials secret
    const dbSecret = new secretsmanager.Secret(this, 'AnmDbSecret', {
      secretName: 'anm-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: process.env.DB_USER }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
    });

    // Create application secrets
    const appSecret = new secretsmanager.Secret(this, 'AnmAppSecret', {
      secretName: 'anm-app-secrets',
      secretObjectValue: {
        GOOGLE_CLIENT_ID: cdk.SecretValue.unsafePlainText(process.env.GOOGLE_CLIENT_ID || ''),
        GOOGLE_CLIENT_SECRET: cdk.SecretValue.unsafePlainText(process.env.GOOGLE_CLIENT_SECRET || ''),
        SESSION_SECRET: cdk.SecretValue.unsafePlainText(process.env.SESSION_SECRET || ''),
        AWS_ACCESS_KEY_ID: cdk.SecretValue.unsafePlainText(process.env.AWS_ACCESS_KEY_ID || ''),
        AWS_SECRET_ACCESS_KEY: cdk.SecretValue.unsafePlainText(process.env.AWS_SECRET_ACCESS_KEY || ''),
        S3_BUCKET_NAME: cdk.SecretValue.unsafePlainText(process.env.S3_BUCKET_NAME || ''),
      },
    });

    // Create RDS MySQL database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'AnmDbSecurityGroup', {
      vpc,
      description: 'Security group for ANM database',
      allowAllOutbound: false,
    });

    const database = new rds.DatabaseInstance(this, 'AnmDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: process.env.DB_NAME,
      securityGroups: [dbSecurityGroup],
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Set to true for production
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production
      storageEncrypted: true,
      multiAz: false, // Set to true for production
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'AnmCluster', {
      vpc,
      clusterName: 'anm-cluster',
      containerInsights: true,
    });

    // Domain configuration
    const domainName = 'legacy.paxsolutions.biz';
    const rootDomain = 'paxsolutions.biz';

    // Lookup existing hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'AnmHostedZone', {
      domainName: rootDomain,
    });
    const certificate = new certificatemanager.Certificate(this, 'AnmCertificate', {
      domainName: 'legacy.paxsolutions.biz',
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    // Create Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'AnmLoadBalancer', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'anm-alb',
    });

    // Create security group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AnmAlbSecurityGroup', {
      vpc,
      description: 'Security group for ANM Application Load Balancer',
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');

    alb.addSecurityGroup(albSecurityGroup);

    // Create security group for ECS services
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'AnmEcsSecurityGroup', {
      vpc,
      description: 'Security group for ANM ECS services',
    });
    ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.allTcp(), 'Allow traffic from ALB');

    // Allow ECS to connect to database
    dbSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(3306), 'Allow ECS to connect to database');

    // Create task execution role
    const taskExecutionRole = new iam.Role(this, 'AnmTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant access to secrets
    dbSecret.grantRead(taskExecutionRole);
    appSecret.grantRead(taskExecutionRole);

    // Create task role
    const taskRole = new iam.Role(this, 'AnmTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant S3 access to task role
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        `arn:aws:s3:::${process.env.S3_BUCKET_NAME || ''}`,
        `arn:aws:s3:::${process.env.S3_BUCKET_NAME || ''}/*`,
      ],
    }));

    // Create log groups
    const backendLogGroup = new logs.LogGroup(this, 'AnmBackendLogGroup', {
      logGroupName: '/ecs/anm-backend',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const frontendLogGroup = new logs.LogGroup(this, 'AnmFrontendLogGroup', {
      logGroupName: '/ecs/anm-frontend',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create backend task definition
    const backendTaskDefinition = new ecs.FargateTaskDefinition(this, 'AnmBackendTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    const backendContainer = backendTaskDefinition.addContainer('backend', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logGroup: backendLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: '3306',
        DB_NAME: process.env.DB_NAME || '',
        AWS_REGION: cdk.Stack.of(this).region,
        FRONTEND_URL: process.env.FRONTEND_URL || '',
        API_BASE_URL: process.env.API_BASE_URL || '',
        REACT_APP_API_URL: process.env.REACT_APP_API_URL || '',
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        GOOGLE_CLIENT_ID: ecs.Secret.fromSecretsManager(appSecret, 'GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'GOOGLE_CLIENT_SECRET'),
        SESSION_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'SESSION_SECRET'),
        AWS_ACCESS_KEY_ID: ecs.Secret.fromSecretsManager(appSecret, 'AWS_ACCESS_KEY_ID'),
        AWS_SECRET_ACCESS_KEY: ecs.Secret.fromSecretsManager(appSecret, 'AWS_SECRET_ACCESS_KEY'),
        S3_BUCKET_NAME: ecs.Secret.fromSecretsManager(appSecret, 'S3_BUCKET_NAME'),
      },
    });

    backendContainer.addPortMappings({
      containerPort: 5000,
      protocol: ecs.Protocol.TCP,
    });

    // Create frontend task definition
    const frontendTaskDefinition = new ecs.FargateTaskDefinition(this, 'AnmFrontendTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    const frontendContainer = frontendTaskDefinition.addContainer('frontend', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logGroup: frontendLogGroup,
      }),
    });

    frontendContainer.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP,
    });

    // Create backend service
    const backendService = new ecs.FargateService(this, 'AnmBackendService', {
      cluster,
      taskDefinition: backendTaskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serviceName: 'anm-backend',
    });

    // Create frontend service
    const frontendService = new ecs.FargateService(this, 'AnmFrontendService', {
      cluster,
      taskDefinition: frontendTaskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serviceName: 'anm-frontend',
    });

    // Create target groups
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AnmBackendTargetGroup', {
      vpc,
      port: 5000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AnmFrontendTargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Attach services to target groups
    backendService.attachToApplicationTargetGroup(backendTargetGroup);
    frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // Create standard HTTP listener
    const httpListener = alb.addListener('AnmListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });

    // Add API routing to HTTP listener
    httpListener.addAction('ApiRouting', {
      priority: 100,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*', '/auth/*']),
      ],
      action: elbv2.ListenerAction.forward([backendTargetGroup]),
    });

    // SSL and custom domain configuration (commented out until Route53 is set up)
    // Uncomment the following when you have Route53 hosted zone ready:
    //
    const httpsListener = alb.addListener('AnmHttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
      defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });

    // Add API routing to HTTPS listener
    httpsListener.addAction('ApiRouting', {
      priority: 100,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*', '/auth/*']),
      ],
      action: elbv2.ListenerAction.forward([backendTargetGroup]),
    });

    // Change HTTP listener to redirect to HTTPS
    httpListener.addAction('RedirectToHttps', {
      priority: 200,
      conditions: [elbv2.ListenerCondition.pathPatterns(['*'])],
      action: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Create Route 53 record pointing to ALB
    new route53.ARecord(this, 'AnmAliasRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
    });

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: `https://${domainName}`,
      description: 'HTTPS URL of the application',
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'Custom domain name for the application',
    });

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Direct ALB URL (for reference)',
    });

    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: backendRepo.repositoryUri,
      description: 'Backend ECR repository URI',
    });

    new cdk.CfnOutput(this, 'FrontendRepositoryUri', {
      value: frontendRepo.repositoryUri,
      description: 'Frontend ECR repository URI',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS database endpoint',
    });
  }
}
