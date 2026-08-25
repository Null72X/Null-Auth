# Null-Auth Admin Dashboard Frontend

A modern, high-performance private admin dashboard for **Null-Auth**, built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Lucide React icons. Designed specifically for deployment on **Vercel**.

---

## Key Features

- **Private Admin Interface**: Dark SaaS theme (black/slate background with red `#EF4444` accenting).
- **No Public Registration**: Secure login page connected to backend JWT authentication.
- **Application Manager**: Create, view, edit name, pause/resume, regenerate secret, or delete apps with confirmation.
- **License Key Manager**: Single & bulk license key generation (`NULL-XXXX-XXXX-XXXX`), status filters, search bar, extend days, reset HWID binding, and bulk actions.
- **HWID Whitelist Manager**: Manage authorized machine/user identifiers directly.
- **Activity & Security Audit Logs**: Filterable security log viewer.
- **Settings**: Change admin password & view API endpoints.

---

## Local Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Set your backend API URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 2. Install & Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Vercel Deployment Instructions

1. Push the `null-auth` repository to GitHub / GitLab.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the repository and select `frontend` as the **Root Directory**.
4. Configure Environment Variables in Vercel settings:
   - `NEXT_PUBLIC_API_URL`: Set to your deployed Wispbyte Backend API URL (e.g. `https://api.yourdomain.com/api/v1`).
5. Click **Deploy**.
