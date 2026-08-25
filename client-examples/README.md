# Null-Auth Client SDKs & Console Application Samples

This directory contains production-ready integration examples for embedding **Null-Auth** private authentication & licensing in desktop applications.

For every language (**Python**, **C#**, and **C++**), the SDK directory is split into **2 clean files**:
1. **Core SDK Library**: Reusable SDK class supporting BOTH Auth Methods.
2. **Console Application Sample**: Runnable console application demonstrating interactive user authentication for BOTH Auth Methods.

---

## 📁 Directory Structure

```
client-examples/
├── python/
│   ├── null_auth_sdk.py       # File 1: Core Python 3 SDK Library
│   └── auth_console_app.py    # File 2: Console Application Sample (Both Methods)
├── csharp/
│   ├── NullAuthSDK.cs         # File 1: Core C# .NET SDK Library
│   └── AuthConsoleApp.cs      # File 2: Console Application Sample (Both Methods)
├── cpp/
│   ├── NullAuthSDK.hpp        # File 1: Core C++ WinINet SDK Library Header
│   └── AuthConsoleApp.cpp     # File 2: Console Application Sample (Both Methods)
└── README.md
```

---

## 🔑 Authentication Modes Supported in Both Files

### Method 1: License Key + Bound Machine SID
- **Endpoint**: `POST /api/v1/client/license/authenticate`
- **Request Body**:
```json
{
  "appId": "NA-48392017",
  "appSecret": "nas_xxxxxxxxxxxxxxxxxxxxxxxx",
  "licenseKey": "NULL-ABCD-1234-EFGH",
  "hwid": "S-1-5-21-38294-..."
}
```

### Method 2: HWID Direct Whitelist Access
- **Endpoint**: `POST /api/v1/client/hwid/authenticate`
- **Request Body**:
```json
{
  "appId": "NA-48392017",
  "appSecret": "nas_xxxxxxxxxxxxxxxxxxxxxxxx",
  "hwid": "S-1-5-21-38294-..."
}
```

---

## ⚡ Standardized API Response

```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "status": "active",
    "expires_at": "2027-01-01T00:00:00.000Z",
    "remaining_days": 365
  }
}
```
