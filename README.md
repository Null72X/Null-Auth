# Null-Auth

## Overview
Enterprise software licensing and authentication system featuring a TypeScript / Node.js API backend, a Next.js administrative web dashboard, and multi-language client integration SDKs for C++, C#, Python, and Android.

## Features
- **Cryptographic License Management**: Secure generation, activation, and revocation of software licenses.
- **Hardware ID (HWID) Verification**: Automatic HWID locking with administrative reset controls to prevent license sharing.
- **Next.js Admin Dashboard**: Modern web interface for managing users, licenses, subscriptions, and security logs.
- **Multi-Client SDK Support**: Pre-built integration libraries for C++, C#, Python, and Android applications.
- **Vercel / Serverless Ready**: Scalable API architecture ready for deployment on Vercel or cloud containers.

## Structure
```text
Null-Auth/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json
│   ├── .env.example
│   └── src/
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   └── src/
├── client-examples/
│   ├── cpp/
│   ├── csharp/
│   ├── python/
│   └── android/
├── README.md
└── .gitignore
```

## Requirements
- Node.js 18.0.0 or higher
- npm or pnpm package manager
- Modern web browser for administrative dashboard
- C++, C#, Python, or Android toolchains for testing client examples

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Null72X/Null-Auth.git
   ```
2. Install backend dependencies:
   ```bash
   cd Null-Auth/backend
   npm install
   cp .env.example .env
   ```
3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

## Usage
1. Configure database connection and secrets in `backend/.env`.
2. Start backend server:
   ```bash
   cd backend && npm run dev
   ```
3. Start admin dashboard:
   ```bash
   cd frontend && npm run dev
   ```
4. Integrate the respective client SDK from `client-examples/` into your software.

## Build
To produce production builds:
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```
