# Azure App Service Deployment Guide

## Prerequisites
✅ Azure for Students account activated ($100 credit)
✅ Backend code ready in this folder

## Deployment Steps

### 1. Create Web App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → Search for **"Web App"**
3. Click **"Create"**

### 2. Configure Web App

**Basics:**
- **Subscription**: Azure for Students
- **Resource Group**: Create new → `flowstate-rg`
- **Name**: `flowstate-backend` (or any unique name)
- **Publish**: Code
- **Runtime stack**: Node 20 LTS (recommended) or Node 22/24
- **Operating System**: Linux (IMPORTANT - needed for yt-dlp)
- **Region**: Choose closest to you (e.g., East US, West Europe)

**Pricing:**
- **Linux Plan**: Create new
- **Pricing tier**: F1 (Free) or B1 (Basic - $13/month, use your $100 credit)
  - Recommendation: Start with F1, upgrade to B1 if needed

### 3. Deploy Code

**Option A: GitHub Deployment (Easiest)**
1. After creating the Web App, go to **Deployment Center**
2. Select **GitHub** as source
3. Authorize Azure to access your GitHub
4. Select your repository and branch
5. Azure will auto-detect Node.js

**Option B: Local Git**
1. In Deployment Center, select **Local Git**
2. Copy the Git URL
3. In your terminal:
```bash
cd backend
git init
git add .
git commit -m "Initial backend"
git remote add azure <paste-git-url>
git push azure main
```

### 4. Configure Application Settings

Go to **Configuration** → **Application settings** → **New application setting**

Add these:
- `FRONTEND_URL` = `https://flowstate-music.vercel.app`
- `PORT` = `8080` (Azure default)
- `NODE_ENV` = `production`

### 5. Set Startup Command

Go to **Configuration** → **General settings** → **Startup Command**

Enter:
```
./startup.sh
```

Or if that doesn't work, try:
```
pip3 install yt-dlp && npm run build && npm start
```

### 6. Enable Logs (Optional but helpful)

Go to **App Service logs** → Enable:
- Application logging: File System
- Detailed error messages: On

### 7. Get Your Backend URL

After deployment completes:
- Your backend URL: `https://flowstate-backend.azurewebsites.net`
- Test it: `https://flowstate-backend.azurewebsites.net/api/health`

## Update Frontend

Update your Vercel environment variable:
```
VITE_BACKEND_URL=https://flowstate-backend.azurewebsites.net
```

## Troubleshooting

**If yt-dlp fails to install:**
1. Go to **SSH** in Azure Portal
2. Run: `pip3 install yt-dlp`
3. Restart the app

**If app doesn't start:**
1. Check **Log stream** for errors
2. Verify PORT is set to 8080
3. Check that build completed successfully

## Cost Estimate

- **F1 Free tier**: $0/month (limited resources)
- **B1 Basic**: ~$13/month (better performance)
- With $100 credit: 7+ months free on B1

## Resume Bullet Point

"Deployed Express.js microservice on **Azure App Service** with CI/CD pipeline from GitHub, implementing yt-dlp integration for audio processing with RESTful API endpoints"
