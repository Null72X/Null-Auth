# Null-Auth — Private Authentication & Licensing Platform

**Null-Auth** is a complete, production-ready, self-hosted private authentication and licensing platform. Designed strictly for administrator-controlled applications with unlimited apps and two authentication modes:

1. **License Key + Bound Machine/User Identifier** (`NULL-XXXX-XXXX-XXXX` key bound on first activation)
2. **Authorized HWID / Identifier Access** (Direct whitelist without license keys)

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
│   │   ├── schema.prisma     # SQLite/PostgreSQL Database Schema
│   │   └── seed.ts           # Admin user creation script
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

## Quick Start Guide

### 1. Setup Backend REST API
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
Backend API will start at `http://localhost:5000`.

### 2. Setup Frontend Dashboard
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Dashboard will start at `http://localhost:3000`. Log in using default credentials:
- **Username**: `admin`
- **Password**: `NullAuthAdminPassword2026!`

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
