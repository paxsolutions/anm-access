#!/bin/bash

# Setup SSL and Custom Domain for ANM App
set -e

echo "🔒 Setting up SSL and Custom Domain"
echo "=================================="

DOMAIN="paxsolutions.biz"
SUBDOMAIN="legacy.paxsolutions.biz"

# Check if hosted zone already exists
echo "🔍 Checking for existing hosted zone..."
EXISTING_ZONE=$(aws route53 list-hosted-zones-by-name --dns-name $DOMAIN --query 'HostedZones[0].Id' --output text 2>/dev/null || echo "None")

if [ "$EXISTING_ZONE" = "None" ] || [ -z "$EXISTING_ZONE" ]; then
    echo "📝 Creating hosted zone for $DOMAIN..."
    
    # Create hosted zone
    ZONE_OUTPUT=$(aws route53 create-hosted-zone \
        --name $DOMAIN \
        --caller-reference "anm-$(date +%s)" \
        --hosted-zone-config Comment="Hosted zone for ANM application")
    
    ZONE_ID=$(echo $ZONE_OUTPUT | jq -r '.HostedZone.Id')
    NAME_SERVERS=$(echo $ZONE_OUTPUT | jq -r '.DelegationSet.NameServers[]')
    
    echo "✅ Hosted zone created successfully!"
    echo "Zone ID: $ZONE_ID"
    echo ""
    echo "🚨 IMPORTANT: Update your domain registrar's name servers"
    echo "=================================================="
    echo "Set these name servers in your domain registrar for $DOMAIN:"
    echo ""
    echo "$NAME_SERVERS"
    echo ""
    echo "⏰ DNS propagation may take up to 48 hours"
    echo ""
    read -p "Have you updated your domain's name servers? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update your name servers first, then run this script again."
        exit 0
    fi
else
    echo "✅ Hosted zone already exists: $EXISTING_ZONE"
fi

echo ""
echo "🏗️ Now enabling SSL in CDK stack..."

# Uncomment the SSL configuration in CDK stack
echo "📝 Updating CDK stack to enable SSL..."

# Create a temporary script to uncomment SSL configuration
cat > ../infrastructure/enable-ssl.js << 'EOF'
const fs = require('fs');

const stackFile = './lib/anm-app-stack.ts';
let content = fs.readFileSync(stackFile, 'utf8');

// Uncomment the hosted zone and certificate lines
content = content.replace(
    /\/\/ const hostedZone = route53\.HostedZone\.fromLookup\(this, 'AnmHostedZone', \{[\s\S]*?\}\);/,
    `const hostedZone = route53.HostedZone.fromLookup(this, 'AnmHostedZone', {
      domainName: 'paxsolutions.biz',
    });`
);

content = content.replace(
    /\/\/ const certificate = new certificatemanager\.Certificate\(this, 'AnmCertificate', \{[\s\S]*?\}\);/,
    `const certificate = new certificatemanager.Certificate(this, 'AnmCertificate', {
      domainName: 'legacy.paxsolutions.biz',
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });`
);

// Uncomment the HTTPS listener configuration
content = content.replace(
    /\/\/ const httpsListener = alb\.addListener\('AnmHttpsListener', \{[\s\S]*?\}\);/,
    `const httpsListener = alb.addListener('AnmHttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
      defaultAction: elbv2.ListenerAction.forward([frontendTargetGroup]),
    });`
);

// Update backend environment to use HTTPS
content = content.replace(
    /FRONTEND_URL: `http:\/\/\$\{alb\.loadBalancerDnsName\}`,/,
    `FRONTEND_URL: 'https://legacy.paxsolutions.biz',`
);

fs.writeFileSync(stackFile, content);
console.log('✅ SSL configuration enabled in CDK stack');
EOF

cd ../infrastructure
node enable-ssl.js
rm enable-ssl.js

echo "🚀 Deploying infrastructure with SSL..."
if command -v cdk > /dev/null 2>&1; then
    cdk deploy --require-approval never
elif command -v npx > /dev/null 2>&1; then
    npx cdk deploy --require-approval never
else
    echo "❌ CDK not found. Please install with: npm install -g aws-cdk"
    exit 1
fi

cd ../scripts

echo ""
echo "🎉 SSL Setup Complete!"
echo "====================="
echo "✅ SSL Certificate: Created and validating"
echo "✅ HTTPS Listener: Configured on ALB"
echo "✅ Domain: $SUBDOMAIN"
echo ""
echo "⏰ Certificate validation may take 5-10 minutes"
echo "🌐 Your app will be available at: https://$SUBDOMAIN"
echo ""
echo "Next: Run './update-frontend-url.sh' to rebuild frontend with HTTPS"
