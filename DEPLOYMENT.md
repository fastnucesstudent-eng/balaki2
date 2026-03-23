# 🚀 Deployment Guide: Tarzify Store

This guide outlines the steps to deploy the **Frontend to Hostinger** and the **Backend to an Azure Ubuntu VM**, with automated CI/CD pipelines using GitHub Actions.

---

## 🌍 Part 1: Backend Deployment (Azure VM)

**Goal:** Run the Node.js/Express server on your Ubuntu VM and auto-update on push.

### 1. Prepare the Azure VM
SSH into your VM:
```bash
ssh azureuser@<YOUR_VM_IP>
```

Install Node.js & PM2 (Process Manager):
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2 ts-node typescript
```

Cloning the Repo & Setup:
```bash
# Clone your repo (replace with your actual repo URL)
git clone https://github.com/malikabdullah1786/ecomerencewebsite.git
cd ecomerencewebsite/server

# Install dependencies
npm install

# Create .env file manually (NEVER commit this to GitHub)
nano .env
# Paste your Supabase URL, Keys, and Resend Key here.
# Save and exit (Ctrl+X, Y, Enter)
```

Start the Server with PM2:
```bash
# Build the project
npm run build

# Start the server
pm2 start dist/index.js --name "tarzify-backend"

# Save PM2 list so it restarts on reboot
pm2 save
pm2 startup
```

### 2. Configure GitHub Actions for Backend
Create a file in your project: `.github/workflows/deploy-backend.yml`

*You need to add these secrets in GitHub Repo -> Settings -> Secrets and variables -> Actions:*
*   `AZURE_HOST`: Your VM IP Address
*   `AZURE_USERNAME`: `azureuser` (or your username)
*   `AZURE_KEY`: Your Private SSH Key (Open `id_rsa` on your local PC and copy content)

---

## 🎨 Part 2: Frontend Deployment (Hostinger)

**Goal:** Build the React app and upload the static files to Hostinger via FTP.

### 1. Get FTP Details from Hostinger
*   **FTP Host**: `147.93.17.58` (You provided this!)
*   **FTP Username**: (Check Hostinger Dashboard)
*   **FTP Password**: (Check Hostinger Dashboard)

### 2. Configure GitHub Actions for Frontend
Create a file in your project: `.github/workflows/deploy-frontend.yml`

*Add these secrets to GitHub:*
*   `FTP_SERVER`: `147.93.17.58`
*   `FTP_USERNAME`: Your Hostinger FTP Username
*   `FTP_PASSWORD`: Your Hostinger FTP Password

### 3. Update Frontend Environment
In your local code, create/update `.env.production`:
```
VITE_API_URL=http://<YOUR_AZURE_VM_IP>:3000/api
```
*(Note: If you have a domain for the backend, use `https://api.yourdomain.com` instead)*

---

## 🔒 Part 3: Secrets Checklist

Go to **GitHub Repo -> Settings -> Secrets usage -> New repository secret** and add:

| Secret Name | Value |
| :--- | :--- |
| **FTP_SERVER** | `147.93.17.58` |
| **FTP_USERNAME** | (Your Hostinger Username) |
| **FTP_PASSWORD** | (Your Hostinger Password) |
| **AZURE_HOST** | (Your Azure VM Public IP) |
| **AZURE_USERNAME** | `azureuser` |
| **AZURE_KEY** | (Your SSH Private Key) |
| **VITE_API_URL** | `http://<YOUR_VM_IP>:3000/api` |

---

## 📁 Part 4: Project Organization & Environment

### 📦 Migration Files
Database migrations have been organized into the following directories:
- **Frontend Root**: `database/migrations/`
- **Backend Root**: `server/database/migrations/`

Use these when setting up your production database schema in Supabase.

### 🔐 Environment Variables
We have created `.env.production` templates. For production, ensure these are used:
- **Frontend**: `.env.production` (Vite will automatically use this during `npm run build`)
- **Backend**: `server/.env.production` (Copy this to your Azure VM as `.env`)

---

## ✅ Summary of Next Steps for You

1.  **Repo Secrets**: Go to GitHub and add the secrets mentioned above.
2.  **Azure Setup**: SSH into your VM, copy `server/.env.production` to `server/.env`, and update the secrets.
3.  **Build**: Run `npm run build` locally to generate the `dist/` folder for Hostinger.
4.  **Push Code**: Once you push changes, the GitHub Actions will trigger!

---

## 🛠 Troubleshooting
- **Build Errors**: Ensure `typescript` 5.x is used.
- **CORS**: If you change the domain, update `BACKEND_URL` and `FRONTEND_URL` in your `.env` files.
- **Seed Endpoint**: The `/api/setup/seed` endpoint is disabled when `NODE_ENV=production`.
