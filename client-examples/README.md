# Null-Auth Client SDK Examples

This directory contains production-ready integration examples for embedding **Null-Auth** private authentication & licensing in desktop applications.

Available Clients:
- **C# (`/csharp/NullAuthClient.cs`)**: C# .NET implementation with Windows SID retrieval (`whoami /user` fallback to `WindowsIdentity.GetCurrent()`), JSON serialization, and HTTP client requests.
- **C++ (`/cpp/NullAuthClient.cpp`)**: Native Windows C++ implementation using WinINet API and command line SID extraction.
- **Python (`/python/null_auth_client.py`)**: Zero-dependency Python 3 client using standard library `subprocess` and `urllib`.

---

## 1. Authentication Modes

### Mode 1: License Key + Bound HWID
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
- **Behavior**: On first activation, the license is bound to the provided HWID. Subsequent authentications from different HWIDs will be rejected (`HWID_MISMATCH`).

### Mode 2: HWID Direct Whitelist Access
- **Endpoint**: `POST /api/v1/client/hwid/authenticate`
- **Request Body**:
```json
{
  "appId": "NA-48392017",
  "appSecret": "nas_xxxxxxxxxxxxxxxxxxxxxxxx",
  "hwid": "S-1-5-21-38294-..."
}
```
- **Behavior**: Verifies that the client's HWID is explicitly listed on the application's authorized whitelist.

---

## 2. Standardized API Responses

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "status": "active",
    "expires_at": "2027-01-01T00:00:00.000Z",
    "remaining_days": 365,
    "first_activated_at": "2026-08-25T07:20:00.000Z"
  }
}
```

### Error Response (`401 / 403 / 404`)
```json
{
  "success": false,
  "message": "License key has expired",
  "error": "LICENSE_EXPIRED"
}
```

Possible Error Codes:
- `APPLICATION_NOT_FOUND`
- `INVALID_APP_CREDENTIALS`
- `APPLICATION_DISABLED`
- `LICENSE_NOT_FOUND`
- `LICENSE_PAUSED`
- `LICENSE_BANNED`
- `LICENSE_EXPIRED`
- `HWID_MISMATCH`
- `IDENTIFIER_NOT_FOUND`
- `IDENTIFIER_PAUSED`
- `IDENTIFIER_BANNED`
- `IDENTIFIER_EXPIRED`
