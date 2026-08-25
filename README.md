# Null-Auth — Private Authentication & Licensing Platform

**Null-Auth** is a complete, production-ready, self-hosted private authentication and licensing platform. Designed strictly for administrator-controlled applications with unlimited apps and two authentication modes:

1. **License Key + Bound Machine/User Identifier** (`NULL-XXXX-XXXX-XXXX` key bound on first activation)
2. **Authorized HWID / Identifier Access** (Direct whitelist without license keys)

Built for 100% deployment on **Vercel** with a **Supabase PostgreSQL** cloud database.

---

## Directory Structure

```text
null-auth/
│
├── backend/                  # REST API Server (Node.js + Express + TypeScript + Prisma)
│   ├── src/
│   │   ├── controllers/      # Route logic for Auth, Apps, Licenses, HWID, Logs
│   │   ├── middleware/       # JWT Auth, Rate Limiter, Zod Validation, Error Handler
│   │   ├── routes/           # Versioned API routes (/api/v1/...)
│   │   ├── services/         # Logger and HWID hashing services
│   │   └── utils/            # App ID, Secret & License Generators
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL Database Schema for Supabase
│   │   └── seed.ts           # Admin user creation script
│   ├── vercel.json           # Vercel serverless configuration
│   ├── .env.example
│   └── README.md
│
├── frontend/                 # Admin Dashboard Website (Next.js 14 + Tailwind CSS)
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # UI Components, Modals & Layouts
│   ├── lib/                  # API client & auth token storage
│   ├── .env.example
│   └── README.md
│
├── client-examples/          # Integration SDKs for Desktop Clients
│   ├── csharp/               # C# .NET integration sample
│   ├── cpp/                  # C++ Win32 integration sample
│   ├── python/               # Python 3 integration sample
│   └── README.md
│
└── README.md
```

---

## Deployment on Vercel & Supabase

### 1. Get Supabase Connection String
Get your free database URL from **[Supabase.com](https://supabase.com)**:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

### 2. Push Database Schema to Supabase
```bash
cd backend
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Deploy Backend to Vercel
- Import repository on Vercel, set Root Directory = `backend`.
- Add Environment Variable: `DATABASE_URL` = *(Your Supabase URL)*.

### 4. Deploy Frontend to Vercel
- Import repository on Vercel, set Root Directory = `frontend`.
- Add Environment Variable: `NEXT_PUBLIC_API_URL` = `https://your-backend.vercel.app/api/v1`.

---

## Default Initial Admin Credentials
Configure in `backend/.env`:
- **Username**: `admin`
- **Password**: `NullAuthAdminPassword2026!`

> [!IMPORTANT]
> Change the default admin password immediately after logging into the dashboard via **Settings**.

---

## Client Integration Overview

- **C# Client**: See [`client-examples/csharp/NullAuthClient.cs`](file:///d:/Null-Auth/client-examples/csharp/NullAuthClient.cs)
- **C++ Client**: See [`client-examples/cpp/NullAuthClient.cpp`](file:///d:/Null-Auth/client-examples/cpp/NullAuthClient.cpp)
- **Python Client**: See [`client-examples/python/null_auth_client.py`](file:///d:/Null-Auth/client-examples/python/null_auth_client.py)
