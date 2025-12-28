# AWS Elastic Beanstalk Deployment Guide

## Why AWS Elastic Beanstalk?
✅ **Free Tier**: 750 hours/month of t2.micro (always-on!)
✅ **1GB RAM**: Better performance than Azure F1
✅ **Best Resume Value**: AWS is #1 cloud provider (33% market share)
✅ **No Quota Limits**: Unlike Azure for Students
✅ **Easy Deployment**: Similar to Heroku/Render

---

## Prerequisites
- AWS account with Free Tier or AWS Educate credits
- Backend code ready in this folder

---

## Deployment Steps

### 1. Sign Up for AWS Educate (GitHub Student Pack)

1. Go to [GitHub Student Developer Pack](https://education.github.com/pack)
2. Find **AWS Educate** or **AWS Promotional Credits**
3. Follow the link to claim your credits ($100-200)
4. Or sign up for [AWS Free Tier](https://aws.amazon.com/free/)

### 2. Install AWS CLI (Optional but Recommended)

**macOS:**
```bash
brew install awscli
```

**Or use the Web Console** (we'll use this for simplicity)

### 3. Create Application on Elastic Beanstalk

#### Option A: Web Console (Easiest)

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for **"Elastic Beanstalk"**
3. Click **"Create Application"**

**Configure Application:**
- **Application name**: `flowstate-backend`
- **Platform**: Node.js
- **Platform branch**: Node.js 20 running on 64bit Amazon Linux 2023
- **Application code**: Upload your code (see below)

**Upload Code:**
1. Zip the entire `/backend` folder:
   ```bash
   cd /Users/aadhavmanimurugan/Desktop/3d-audio-visualizer
   cd backend
   zip -r ../flowstate-backend.zip . -x "*.git*" -x "*node_modules*"
   ```
2. Upload `flowstate-backend.zip` in the console

**Configure Service Access:**
- Create new service role (AWS will create automatically)

**Set Up Networking, Database, and Tags** (skip/default)

**Configure Instance Traffic and Scaling:**
- **Environment type**: Single instance (Free Tier)
- **Instance type**: t2.micro (Free Tier eligible)
- **Root volume**: General Purpose (SSD), 10 GB

**Configure Updates, Monitoring, and Logging:**
- Keep defaults

#### Option B: Using EB CLI (Advanced)

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
cd backend
eb init -p node.js-20 flowstate-backend --region us-east-1

# Create environment
eb create flowstate-env --instance-type t2.micro --single

# Deploy
eb deploy
```

### 4. Configure Environment Variables

After creating the application:

1. Go to **Configuration** → **Software** → **Edit**
2. Scroll to **Environment properties**
3. Add these variables:
   - `FRONTEND_URL` = `https://flowstate-music.vercel.app`
   - `PORT` = `8080`
   - `NODE_ENV` = `production`
4. Click **"Apply"**

### 5. Verify Deployment

1. Once deployment completes, get your URL:
   - Format: `flowstate-env.us-east-1.elasticbeanstalk.com`
2. Test health endpoint:
   ```
   https://flowstate-env.us-east-1.elasticbeanstalk.com/api/health
   ```

### 6. Enable HTTPS (Optional but Recommended)

1. Go to **Configuration** → **Load balancer**
2. Add listener on port 443
3. Add SSL certificate (can use AWS Certificate Manager - free!)

---

## Update Frontend

Update your Vercel environment variable:
```
VITE_BACKEND_URL=https://flowstate-env.us-east-1.elasticbeanstalk.com
```

---

## Deployment from GitHub (CI/CD)

For automatic deployments:

1. Go to **Configuration** → **Deployment preferences**
2. Or use GitHub Actions with AWS credentials

---

## Monitoring & Logs

1. **Logs**: Configuration → Software → Edit → Log streaming (Enable)
2. **Monitoring**: Click "Monitoring" tab to see metrics
3. **Health**: Dashboard shows environment health

---

## Troubleshooting

### If yt-dlp fails to install:
1. SSH into instance: `eb ssh`
2. Manually install: `sudo pip3 install yt-dlp`
3. Check logs: `eb logs`

### If app doesn't start:
1. Check logs: `eb logs`
2. Verify `package.json` has correct `start` script
3. Check PORT is 8080

### If out of memory:
- Upgrade to t3.small (still cheap with credits)

---

## Cost Breakdown

**Free Tier (12 months):**
- t2.micro: 750 hours/month = **FREE** for 1 instance
- Data transfer: 15 GB/month = **FREE**

**With AWS Educate Credits:**
- $100-200 credits
- If you exceed free tier, credits cover it

**Resume Impact:**
> "Deployed RESTful API on **AWS Elastic Beanstalk** with automated CI/CD, implementing yt-dlp integration for real-time audio processing with 99.9% uptime on t2.micro EC2 instances"

---

## Scaling Later

When ready to scale:
1. Configuration → Capacity
2. Change to **Load balanced**
3. Set min/max instances
4. Auto-scaling based on CPU/traffic
