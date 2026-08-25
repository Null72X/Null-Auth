# Null-Auth Single-File Client SDKs (KeyAuth Style)

Each folder contains **EXACTLY 1 single, standalone auth file** for that language. It includes both the KeyAuth-style `NullAuth` SDK class and a runnable console application entry point supporting **BOTH Auth Methods** (License Key & HWID Whitelist Mode).

---

## 📁 Single-File Structure

```
client-examples/
├── python/
│   └── NullAuth.py    # Single standalone Python 3 Auth file (KeyAuth-style API)
├── csharp/
│   └── NullAuth.cs    # Single standalone C# .NET Auth file (KeyAuth-style API)
├── cpp/
│   └── NullAuth.cpp   # Single standalone C++ WinINet Auth file (KeyAuth-style API)
└── README.md
```

---

## 🔑 KeyAuth-Style SDK Usage Example (Python)

```python
from NullAuth import NullAuth

# Initialize Null-Auth Client
auth = NullAuth(
    name="MyApplication",
    app_id="NA-13026130",
    secret="nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
    version="1.0.0"
)

# Connect & Initialize
if auth.init():
    # Method 1: License Key
    if auth.license("NULL-ABCD-1234-EFGH"):
        print(f"Access Granted! Status: {auth.user_data.status}")
        print(f"Days Remaining: {auth.user_data.remaining_days}")

    # Method 2: HWID Whitelist Only
    # if auth.check_hwid():
    #     print("Machine Whitelisted & Authorized!")
```
