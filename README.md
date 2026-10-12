# 🛡️ Null-Auth

<div align="center">

![Null-Auth Banner](https://img.shields.io/badge/Null--Auth-Cloud%20Security%20Gate-red?style=for-the-badge&logo=shield)
<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-indigo?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=flat-square&logo=windows)](https://microsoft.com)
[![License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)

**Ultra-fast, anti-tamper cloud authentication and licensing engine engineered for desktop applications, software loaders, and native game utilities.**

[Features](#-core-features) • [HWID System](#-cryptographic-hwid-fingerprinting) • [SDKs](#-client-sdk-integration) • [API Reference](#-api-reference) • [Setup Guide](#-setup--deployment) • [Discord Center](#-discord-webhook-command-center)

</div>

---

## 🌟 Core Features

- 🔑 **Triple Authentication Architecture**:
  - **License Key Mode**: Auto-binds on first activation, tracks exact expiration timestamp, supports manual HWID resets and status controls.
  - **Hardware ID (HWID) Whitelist Mode**: Instant keyless authentication bound strictly to verified physical hardware signatures.
  - **Username & Password Mode**: Standard user credentials backed by bcrypt hashing and single-machine hardware lock.
- 🎁 **Master Free Trial Access**:
  - Allows prospective customers to test your software with a master key or trial user account without locking out other concurrent trial users.
- 💻 **Cryptographic Machine HWID Locking**:
  - Non-spoofable SHA-256 fingerprint generated from Windows Cryptography `MachineGuid` and root `C:\` Volume Serial Number.
  - **Zero Admin Privileges Required**: Fully readable by standard Windows user accounts without requiring UAC elevation.
- 🚀 **Single-File Zero-Dependency Client SDKs**:
  - **C# (.NET 8 / NativeAOT)**: Reflection-safe, trim-compatible, native MessageBox error dialogs.
  - **C++ (Win32)**: Pure Windows API (`WinInet` + `WinCrypt`), zero third-party dependencies, single `.cpp`/`.h` drop-in.
  - **Python 3**: Pure Python standard library (`ctypes` + `urllib`), zero pip packages needed.
- 🚨 **Dynamic Native Win32 Error Dialogs**:
  - Client SDKs automatically render native Windows popups for version mismatches, expired keys, paused access, bans, and HWID mismatches.
- 🔄 **Enforced Version Gatekeeping & Auto-Updates**:
  - Compares client binary version against cloud application version. Prompts users with an **Update Required** dialog and direct download URL when outdated.
- 👾 **Real-Time Discord Webhook Command Center**:
  - Live rich embed dispatches for successful logins, blocked attacks, license provisioning, free trial logins, and administrative actions.
- 🛡️ **Hardened API Security**:
  - Express rate limiting (`express-rate-limit`) against brute force, client IP extraction, detailed audit logs, and bcrypt-salted passwords.

---

## 🖥️ Cryptographic HWID Fingerprinting

Null-Auth locks licenses directly to the physical Windows machine using a combined cryptographic digest:

$$\text{HWID} = \text{SHA-256}\Big(\text{MachineGuid} + \texttt{":"} + \text{VolumeSerialNumber}\Big)$$

| Hardware Metric | Origin on Windows | Privileges Needed |
| :--- | :--- | :--- |
| **`MachineGuid`** | `HKLM\SOFTWARE\Microsoft\Cryptography` | None (World-readable registry key) |
| **`VolumeSerialNumber`** | Root `C:\` drive volume serial (`%08X` uppercase hex) | None (`GetVolumeInformationW`) |
| **Digest Output** | 64-character lowercase hexadecimal string | Identical across C++, C#, Python, & PowerShell |

### ⚡ Built-in PowerShell HWID Tool

Null-Auth includes a copyable PowerShell one-liner directly inside **Dashboard $\rightarrow$ Settings $\rightarrow$ Machine HWID Tool**. Run it in any PowerShell terminal to instantly output and auto-copy your HWID to the Windows clipboard:

```powershell
$g = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Cryptography').MachineGuid; $v = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber; $id = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($g + ':' + $v))).Replace('-','').ToLower(); Set-Clipboard $id; Write-Host "HWID (Copied to Clipboard): $id" -ForegroundColor Green
```

---

## 📂 Project Architecture

```text
Null-Auth/
├── backend/                        # Node.js + Express + Prisma API Server
│   ├── src/
│   │   ├── config/                 # Environment & app configurations
│   │   ├── controllers/            # Client auth, admin auth, licenses, users, HWID, logs
│   │   ├── middleware/             # Rate limiters, JWT auth, input validation
│   │   ├── routes/                 # Express API route declarations
│   │   ├── services/               # Discord webhooks, SHA-256 hashing, audit logging
│   │   ├── utils/                  # IP extraction, key generators, response helpers
│   │   ├── app.ts                  # Express application setup
│   │   ├── db.ts                   # Prisma client singleton
│   │   └── server.ts               # HTTP server entrypoint
│   ├── prisma/
│   │   └── schema.prisma           # PostgreSQL database schema & models
│   ├── package.json
│   └── tsconfig.json
├── frontend/                       # Next.js 14 Administrative Cyberpunk Dashboard
│   ├── app/
│   │   ├── (auth)/login/           # Administrator authentication view
│   │   ├── (dashboard)/
│   │   │   ├── applications/       # App management, secrets, version gates, free trials
│   │   │   ├── dashboard/          # Analytics metrics, graphs, live logs
│   │   │   ├── hwid/               # Standalone HWID whitelist manager
│   │   │   ├── licenses/           # License key provisioning, duration, HWID unbind
│   │   │   ├── settings/           # Discord webhooks, single-file SDKs, HWID Tool
│   │   │   └── users/              # User account credentials, passwords, HWID binding
│   │   └── layout.tsx
│   ├── components/                 # Reusable UI cards, tables, buttons, navigation
│   ├── lib/                        # Fetch API client, authentication tokens
│   └── package.json
└── client-examples/                # Ready-to-compile client SDKs
    ├── cpp/NullAuth.cpp            # Single-file WinInet/WinCrypt C++ SDK
    ├── csharp/NullAuth.cs          # Single-file NativeAOT C# (.NET 8) SDK
    └── python/NullAuth.py          # Single-file zero-dependency Python SDK
```

---

## 🚀 Setup & Deployment

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Local database or cloud provider ([Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app))
- **Git**

### 2. Backend Configuration

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/nullauth?sslmode=require"
JWT_SECRET="generate_a_secure_random_secret_here"
JWT_EXPIRES_IN="24h"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="YourStrongPassword123!"
CORS_ORIGIN="http://localhost:3000"
```

Initialize the database schema:
```bash
npx prisma generate
npx prisma db push
```

Start the API server:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 3. Frontend Configuration

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
```

Start the dashboard:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Navigate to `http://localhost:3000` and log in with your configured admin credentials.

---

## 🔌 Client SDK Integration

All client SDKs are standalone, single-file implementations with zero mandatory third-party dependencies.

### 🔷 C# (.NET 8 / NativeAOT)
```csharp
using NullAuthClient;

var auth = new NullAuth(
    appId: "13026130",
    secret: "YOUR_APP_SECRET",
    version: "1.0.0",
    serverUrl: "https://your-api-domain.com"
);

// Method 1: License Key
if (await auth.LicenseAsync("NULL-XXXX-YYYY-ZZZZ"))
{
    Console.WriteLine($"Access Granted! Days Left: {auth.UserData.RemainingDays}");
}

// Method 2: Username & Password
if (await auth.UserLoginAsync("JohnDoe", "MyPassword123!"))
{
    Console.WriteLine($"Logged in as {auth.UserData.ClientName}");
}

// Method 3: HWID Whitelist Only
if (await auth.CheckHwidAsync())
{
    Console.WriteLine("Hardware Authorized!");
}
```

### 🔶 C++ (Win32 / Native MSVC)
```cpp
#include "NullAuth.cpp"

int main() {
    NullAuthClient::NullAuth auth(
        "13026130",
        "YOUR_APP_SECRET",
        "1.0.0",
        "your-api-domain.com"
    );

    // Method 1: License Key
    if (auth.License("NULL-XXXX-YYYY-ZZZZ")) {
        std::cout << "Access Granted to " << auth.userData.clientName << "\n";
    }

    // Method 2: Username & Password
    if (auth.UserLogin("JohnDoe", "MyPassword123!")) {
        std::cout << "Logged in successfully!\n";
    }

    // Method 3: HWID Whitelist Only
    if (auth.CheckHwid()) {
        std::cout << "Hardware Whitelisted!\n";
    }
    return 0;
}
```

### 🐍 Python 3
```python
from NullAuth import NullAuth

auth = NullAuth(
    app_id="13026130",
    secret="YOUR_APP_SECRET",
    version="1.0.0",
    server_url="https://your-api-domain.com"
)

# Method 1: License Key
if auth.license("NULL-XXXX-YYYY-ZZZZ"):
    print(f"Access Granted to {auth.user_data.client_name}!")
    print(f"Days Remaining: {auth.user_data.remaining_days}")

# Method 2: Username & Password
if auth.user_login("JohnDoe", "MyPassword123!"):
    print(f"Authenticated as {auth.user_data.client_name}!")

# Method 3: HWID Whitelist Only
if auth.check_hwid():
    print("Machine Whitelisted!")
```

---

## 📡 API Reference

### 🟢 Public Client Endpoints (`/api/v1/client`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/client/license/authenticate` | Authenticate license key with hardware HWID lock |
| `POST` | `/api/v1/client/hwid/authenticate` | Authenticate machine via HWID whitelist |
| `POST` | `/api/v1/client/user/authenticate` | Authenticate username and password with HWID lock |
| `GET` | `/health` | Check API server health and status |

#### Sample License Authentication Request (`POST /api/v1/client/license/authenticate`)
```json
{
  "appId": "13026130",
  "appSecret": "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
  "licenseKey": "NULL-ABCD-1234-EFGH",
  "hwid": "43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b",
  "version": "1.0.0"
}
```

#### Sample Successful Response (`200 OK`)
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "status": "active",
    "client_name": "AlphaUser",
    "ip": "192.168.1.50",
    "expires_at": "2026-11-12T18:00:00.000Z",
    "remaining_days": 31,
    "first_activated_at": "2026-10-12T18:00:00.000Z",
    "version": "1.0.0"
  }
}
```

---

### 🔴 Administrator Endpoints (`/api/v1/admin`)

*Requires `Authorization: Bearer <JWT_TOKEN>` header.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/admin/auth/login` | Administrator login and JWT issuance |
| `GET` | `/api/v1/admin/apps` | List all applications |
| `POST` | `/api/v1/admin/apps` | Create a new application with secrets |
| `GET` | `/api/v1/admin/licenses` | Filter and paginate license records |
| `POST` | `/api/v1/admin/licenses/generate` | Batch generate license keys |
| `PUT` | `/api/v1/admin/licenses/:id` | Update license key, status, expiration, or HWID |
| `POST` | `/api/v1/admin/licenses/:id/reset-hwid` | Unlink bound HWID to allow re-activation |
| `GET` | `/api/v1/admin/users` | List client user accounts |
| `POST` | `/api/v1/admin/users` | Create user account with credentials |
| `PUT` | `/api/v1/admin/users/:id` | Edit user username, password, or reset HWID |
| `GET` | `/api/v1/admin/hwid` | List whitelisted hardware IDs |
| `POST` | `/api/v1/admin/hwid` | Manually whitelist a hardware signature |
| `POST` | `/api/v1/admin/settings/webhook` | Configure Discord Webhook Command Center |
| `POST` | `/api/v1/admin/settings/webhook/test` | Dispatch test ping embed to Discord |

---

## 👾 Discord Webhook Command Center

Null-Auth includes native Discord integration to dispatch rich embeds directly into your operations channel:

```text
┌────────────────────────────────────────────────────────┐
│ 🟢 Client Authentication Success                      │
│ Client successfully authenticated into Pro Cheat Loader│
│                                                        │
│ Application: Pro Cheat Loader    Client: AlphaTester   │
│ Key: KEY-9A82-F012-BC44          Version: v1.0.0       │
│ HWID: 43f3ef9ce386ba5ca3a97714c92346a2a4da153...      │
│ IP: 192.168.1.100                Status: Active        │
└────────────────────────────────────────────────────────┘
```

- **Configurable Bot Avatar & Username**: Brand your Discord alerts.
- **Granular Event Toggles**:
  - `AUTH_SUCCESS`: Successful activations & regular logins.
  - `AUTH_FAIL`: Security gate alerts (HWID Mismatch, Banned, Expired, Paused, Version Mismatch).
  - `KEY_CREATE`: Provisioning new keys or user accounts.
  - `FREE_TRIAL`: Client connections utilizing free trial access.
  - `ADMIN_ACTION`: HWID resets, license bans, duration extensions.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) - feel free to use and adapt it for personal or commercial software distribution.
