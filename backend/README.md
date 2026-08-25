# Null-Auth Backend REST API

Null-Auth Backend is a self-hosted, private REST API built with Node.js, Express, TypeScript, and Prisma ORM. Designed for deployment on **Wispbyte** or any standard VPS/Linux server.

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
Edit `.env` to configure your database URL and JWT secret:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="file:./dev.db" # Or postgresql://user:pass@localhost:5432/nullauth
JWT_SECRET=your_super_secret_32_char_key
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=YourSecurePassword123!
CORS_ORIGIN=https://your-null-auth-frontend.vercel.app
```

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Seed Initial Admin User
```bash
npm run seed
```

### 4. Build & Start Server
```bash
# Development Mode
npm run dev

# Production Mode
npm run build
npm start
```

---

## Deployment Guide (Wispbyte / VPS)

1. Upload the `backend/` directory to your Wispbyte server.
2. Install Node.js v18+ and PM2:
   ```bash
   npm install -g pm2
   ```
3. Run migrations and seed admin user:
   ```bash
   npx prisma db push
   npm run seed
   ```
4. Start process with PM2:
   ```bash
   pm2 start dist/server.js --name "null-auth-backend"
   pm2 save
   ```
5. Configure Nginx Reverse Proxy & SSL (Certbot):
   ```nginx
   server {
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
