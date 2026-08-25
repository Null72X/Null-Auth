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

## Vercel Deployment Instructions

1. Push the `null-auth` repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import the repository and select `frontend` as the **Root Directory**.
4. Configure Environment Variables in Vercel settings:
   - `NEXT_PUBLIC_API_URL`: Set to your deployed Vercel Backend API URL (e.g. `https://your-null-auth-backend.vercel.app/api/v1`).
5. Click **Deploy**.
