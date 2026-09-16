# Null-Auth Single-File Client SDKs (KeyAuth Style)

Each directory contains **EXACTLY 1 single, standalone auth file** for that language. Each implementation is zero-dependency, production-ready, and includes both the KeyAuth-style `NullAuth` SDK class and a runnable interactive console application supporting **BOTH Authentication Methods**:
1. **Method 1: License Key Authentication** (Bound to client's Machine SID on first activation)
2. **Method 2: HWID Whitelist Mode** (Instant direct machine authorization)

---

## 📁 Repository Structure

```
client-examples/
├── python/
│   └── NullAuth.py    # Standalone Python 3 Client (Zero pip packages required)
├── csharp/
│   └── NullAuth.cs    # Standalone C# .NET Client (Win32 P/Invoke, NativeAOT Safe)
├── cpp/
│   └── NullAuth.cpp   # Standalone C++ WinINet Client (Direct HTTPS via wininet.lib)
└── README.md          # Comprehensive Client SDK Documentation
```

---

## 🚀 Quick Start Guides

### 1. Python (`python/NullAuth.py`)
* **Requirements:** Python 3.7+ on Windows.
* **Dependencies:** None! Uses Python standard library (`urllib`, `ctypes`, `subprocess`, `platform`).
* **Run directly:**
  ```bash
  python NullAuth.py
  ```
* **SDK Usage in your own code:**
  ```python
  from NullAuth import NullAuth

  auth = NullAuth(
      app_id="13026130",                                         # Clean 8-digit numeric App ID
      secret="334106af8244ffc4284df3f2c31709011681d10cfa37e67a", # 48-char raw Secret Key
      version="1.0.0"
  )

  if auth.init():
      # Method 1: License Key
      if auth.license("NULL-ABCD-1234-EFGH"):
          print(f"Access Granted to: {auth.user_data.client_name}")
          print(f"Days Remaining: {auth.user_data.remaining_days}")
          print(f"Assigned IP: {auth.user_data.ip}")

      # Method 2: HWID Whitelist
      # if auth.check_hwid():
      #     print("Machine SID Whitelisted!")
  ```

---

### 2. C# .NET (`csharp/NullAuth.cs`)
* **Requirements:** .NET 6.0+, .NET Framework 4.7+, or NativeAOT.
* **Dependencies:** None! Uses native Win32 `user32.dll` P/Invoke for modal alerts, avoiding any Windows Forms or NuGet package requirements.
* **Compile & Run:**
  ```bash
  # Option A: With .NET SDK
  dotnet new console -o NullApp
  copy NullAuth.cs NullApp/Program.cs
  cd NullApp && dotnet run

  # Option B: With Roslyn / CSC compiler
  csc /out:NullAuth.exe NullAuth.cs
  NullAuth.exe
  ```
* **SDK Usage in your own code:**
  ```csharp
  using NullAuthClient;

  var auth = new NullAuth(
      appId: "13026130",
      secret: "334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
      version: "1.0.0"
  );

  if (await auth.InitAsync())
  {
      if (await auth.LicenseAsync("NULL-ABCD-1234-EFGH"))
      {
          Console.WriteLine($"Welcome, {auth.UserData.ClientName}!");
          Console.WriteLine($"Days Left: {auth.UserData.RemainingDays}");
      }
  }
  ```

---

### 3. C++ (`cpp/NullAuth.cpp`)
* **Requirements:** MSVC (Visual Studio / Build Tools) or MinGW on Windows.
* **Dependencies:** `wininet.lib` (built into Windows).
* **Compile & Run:**
  ```cmd
  :: Microsoft Visual C++ (MSVC Developer Command Prompt)
  cl /EHsc NullAuth.cpp /link wininet.lib /out:NullAuth.exe
  NullAuth.exe

  :: MinGW / GCC
  g++ -O2 NullAuth.cpp -lwininet -o NullAuth.exe
  NullAuth.exe
  ```
* **SDK Usage in your own code:**
  ```cpp
  #include "NullAuth.cpp"

  NullAuthClient::NullAuth auth("13026130", "334106af8244ffc4284df3f2c31709011681d10cfa37e67a", "1.0.0");

  if (auth.Init()) {
      if (auth.License("NULL-ABCD-1234-EFGH")) {
          std::cout << "Access Granted to: " << auth.userData.clientName << std::endl;
          std::cout << "Days Remaining: " << auth.userData.remainingDays << std::endl;
      }
  }
  ```

---

## 📡 Backend API Endpoints & Response Schema

### Endpoints
* **Health Check:** `GET /health`
* **License Authentication (Method 1):**
  * `POST /api/v1/client/license/authenticate`
  * `POST /api/client/auth/license`
* **HWID Whitelist Authentication (Method 2):**
  * `POST /api/v1/client/hwid/authenticate`
  * `POST /api/client/auth/hwid`

### Request Body (Method 1: License Key)
```json
{
  "appId": "13026130",
  "appSecret": "334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
  "licenseKey": "NULL-ABCD-1234-EFGH",
  "hwid": "S-1-5-21-397955417-626881126-1884414030-1001",
  "version": "1.0.0"
}
```

### Successful Response (`200 OK`)
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "status": "active",
    "client_name": "Premium User #14",
    "ip": "203.0.113.42",
    "expires_at": "2026-12-31T23:59:59.000Z",
    "remaining_days": 106,
    "first_activated_at": "2026-09-16T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Error Responses & Handled Codes
If validation fails, the backend returns HTTP 4xx with an explicit error code:
* `VERSION_MISMATCH` (426) – Application is outdated; download URL provided.
* `HWID_MISMATCH` (403) – Key is bound to a different machine SID.
* `LICENSE_EXPIRED` / `IDENTIFIER_EXPIRED` (403) – License subscription ended.
* `LICENSE_BANNED` / `IDENTIFIER_BANNED` (403) – Client machine or key is banned.
* `LICENSE_PAUSED` / `IDENTIFIER_PAUSED` (403) – Access temporarily suspended.
* `LICENSE_NOT_FOUND` / `IDENTIFIER_NOT_FOUND` (404) – Key or HWID does not exist.
* `APPLICATION_DISABLED` (403) – Application disabled in administrator panel.
* `INVALID_APP_CREDENTIALS` (401) – App ID or App Secret mismatch.
