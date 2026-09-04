# Null-Auth — Self-Hosted Private Authentication & Licensing Platform

**Null-Auth** is a production-ready, highly secure, self-hosted private authentication and licensing platform. It is designed strictly for administrator-controlled applications, supporting unlimited apps and offering two distinct client authentication modes.

---

## 🚀 Key Features

*   **Two Authentication Modes**:
    1.  **License Key Mode**: Authenticates clients using a unique license key (`NULL-XXXX-XXXX-XXXX`). The license is dynamically bound to the client's hashed Hardware Identifier (HWID) on its first activation.
    2.  **Authorized HWID whitelisting Mode**: Bypasses license keys entirely. Clients are authenticated directly by verifying their HWID against an administrator-curated whitelist.
*   **Secure HWID / Machine Hashing**: Clients' hardware identifiers (e.g., Windows Security Identifier / SID) are hashed before being stored in the database to protect user privacy.
*   **Version Enforcement**: Administrators can set a required version for each application. The backend validates client requests and issues an update message with a download link if a version mismatch is detected.
*   **Free Trial System**:
    *   For License-based apps: An optional master trial key bypasses the single-device HWID binding check.
    *   For HWID-based apps: Enabling free trial allows instant access to all devices.
*   **Activity Logs**: Automatically logs all admin actions and client authentication attempts (including successful logins, failed attempts, and HWID bindings) with IP addresses and user agents.
*   **Security & Rate Limiting**: Built-in security features, including Express rate limiting, Helmet security headers, CORS protection, and encrypted admin passwords (bcrypt).

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons (Admin Dashboard)
*   **Backend**: Node.js, Express, TypeScript, Zod (Validation), Express-Rate-Limit, Helmet, CORS
*   **Database**: Supabase PostgreSQL with Prisma ORM
*   **Deployment**: Optimized for Vercel (Serverless backend & frontend)

---

## 📁 Directory Structure

```text
null-auth/
│
├── backend/                  # REST API Server (Node.js + Express + TypeScript + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL Database Schema
│   │   └── seed.ts           # Admin user database seeder script
│   ├── src/
│   │   ├── controllers/      # Express route controllers (Auth, Apps, Licenses, HWIDs, Logs)
│   │   ├── middleware/       # JWT authentication, Rate limiting, Zod validation, Error handling
│   │   ├── routes/           # REST API routes under /api/v1/
│   │   ├── services/         # Cryptographic hashing & logger services
│   │   └── utils/            # Helper utilities (License key generator, response formatter)
│   └── vercel.json           # Vercel deployment configuration
│
├── frontend/                 # Admin Dashboard UI (Next.js 14 App Router + Tailwind CSS)
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # Reusable UI components & layouts
│   └── lib/                  # Backend API Client wrappers
│
└── client-examples/          # KeyAuth-Style Client SDKs
    ├── cpp/                  # Win32 C++ integration sample using WinINet
    ├── csharp/               # C# .NET integration sample
    └── python/               # Standalone Python 3 Client SDK (NullAuth.py)
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- A PostgreSQL Database instance (e.g., [Supabase](https://supabase.com))
- Git

### 2. Database Setup & Seeding
1. Retrieve your PostgreSQL connection string (with transaction pooling if using serverless environments).
2. Configure your environment variables in `backend/.env` (see `backend/.env.example`):
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   JWT_SECRET="your_jwt_secret_here"
   INITIAL_ADMIN_USERNAME="admin"
   INITIAL_ADMIN_PASSWORD="NullAuthAdminPassword2026!"
   ```
3. Push the database schema to your database instance:
   ```bash
   cd backend
   npm install
   npx prisma db push
   ```
4. Run the seed script to create your default admin user account:
   ```bash
   npm run seed
   ```

### 3. Running Backend Locally
Start the server in watch/development mode:
```bash
npm run dev
```
The REST API will be accessible on `http://localhost:5000`.

### 4. Running Frontend Dashboard Locally
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   npm install
   ```
2. Configure the backend api endpoint in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
Open `http://localhost:3000` in your web browser. Log in using the admin credentials you configured during seeding.

---

## 📖 System Architecture & Usage Guide

### 1. Database Schema (`backend/prisma/schema.prisma`)

The system relies on five main Prisma models:
- **`Admin`**: Handles dashboard administrator authentication.
- **`Application`**: Represents an app registered on the platform. It can be of type `LICENSE` or `HWID` and maintains configurations like the required version, update URLs, and free-trial settings.
- **`License`**: Used when the application operates under `LICENSE` mode. Contains the unique license key, expiration timestamp, status (`ACTIVE`, `PAUSED`, `EXPIRED`, `BANNED`), and the `boundHwid` representing the client's locked device ID.
- **`HwidAccess`**: Used when the application operates under `HWID` whitelist mode. Whitelists a unique machine `hwidHash` for an application with a custom expiration date.
- **`ActivityLog`**: Provides detailed auditing logs for administrator and client interactions.

### 2. Client Authentication Logic (`backend/src/controllers/clientAuth.controller.ts`)

Authentication queries sent by clients are handled by the controller's endpoints:
*   `authenticateLicense`:
    1. Finds the corresponding `Application` record using the provided `appId` and validates the `appSecret`.
    2. Enforces application version matching. If the client version is outdated, it rejects the request with status code `426 (Update Required)` and provides the application's `downloadUrl`.
    3. If the master trial key is supplied and free trial is enabled on the dashboard, it immediately authorizes the login.
    4. Validates the status and expiration of the license.
    5. Checks the HWID: If no HWID is bound, the server binds the current client's HWID. If an HWID is already bound, it checks that the client's HWID matches the bound value.
*   `authenticateHwid`:
    1. Validates the app credentials and version.
    2. If free trial is enabled, it grants instant access.
    3. Checks the `HwidAccess` table for a whitelisted entry matching the client's hashed HWID.
    4. Validates expiration and status, updating the `lastAuthAt` timestamp upon successful validation.

### 3. Client Integration (Python Example)

The client application hashes its Hardware Identifier and interacts with the REST API. In `client-examples/python/NullAuth.py`, the Windows Security Identifier (SID) is retrieved safely and used as the unique HWID:

```python
from NullAuth import NullAuth

# 1. Initialize Null-Auth SDK Client
auth = NullAuth(
    app_id="NA-13026330",
    secret="nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
    version="1.0.0"
)

# 2. Establish connection to Backend
if auth.init():
    # 3. Mode A: Authenticate using a License Key
    license_key = "NULL-ABCD-1234-EFGH"
    if auth.license(license_key):
        print(f"Access Granted! Days remaining: {auth.user_data.remaining_days}")
    else:
        print("Access Denied.")
```

---

## 🌐 Production Deployment (Vercel)

1.  **Deploy Backend to Vercel**:
    - Import your repository on Vercel, targeting the `backend/` directory as the project root.
    - Set the environment variable `DATABASE_URL` to your production database.
2.  **Deploy Frontend to Vercel**:
    - Import your repository on Vercel, targeting the `frontend/` directory as the project root.
    - Set `NEXT_PUBLIC_API_URL` to `https://your-backend-project.vercel.app/api/v1`.
