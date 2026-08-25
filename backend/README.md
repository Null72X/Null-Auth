# Null-Auth Backend REST API

Null-Auth Backend is a self-hosted, private REST API built with Node.js, Express, TypeScript, and Prisma ORM. Designed for serverless deployment on **Vercel** powered by **Supabase PostgreSQL**.

---

## Technical Features

- **Private Admin Authentication**: Single administrator access, bcrypt password hashing, JWT sessions, rate limiting, and brute-force protection.
- **Unlimited Applications**: Automatic generation of random App IDs (`NA-XXXXXXXX`) and secure API Secrets (`nas_...`). Completely isolated databases for each app.
- **License Authentication**: `NULL-XXXX-XXXX-XXXX` license generation, single/bulk actions, expiration management, and machine HWID/SID binding.
- **HWID Whitelist Authentication**: Direct machine/user identifier authorization without license keys.
- **Activity Audit Logging**: Every administrative action and client authentication attempt is logged with IP, status, and details.
- **Security Middleware**: Helmet headers, express-rate-limit, Zod request validation, CORS protection.

---

## Installation & Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to configure your Supabase Postgres URL and JWT secret:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
JWT_SECRET=your_super_secret_32_char_key
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=YourSecurePassword123!
CORS_ORIGIN=https://your-null-auth-frontend.vercel.app
```

### 2. Push Database Schema to Supabase
```bash
npm install
npx prisma db push
npm run seed
```

---

## Vercel Deployment Instructions

1. Push your project to GitHub.
2. Go to **[Vercel New Project](https://vercel.com/new)**.
3. Import the repository and select `backend` as the **Root Directory**.
4. Configure Environment Variables in Vercel:
   - `DATABASE_URL`: Your Supabase Connection String.
   - `JWT_SECRET`: Secret key for JWT signing.
   - `NODE_ENV`: `production`.
5. Click **Deploy**.
