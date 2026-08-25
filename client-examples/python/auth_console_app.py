#!/usr/bin/env python3
"""
Null-Auth Console Application Sample (Python)
Demonstrates a clean Console Application implementing BOTH Auth Methods:
  - Method 1: License Key Authentication (License Key + Bound Machine SID)
  - Method 2: Direct HWID Whitelist Authentication (Machine SID only)
"""

import sys
import json
from null_auth_sdk import NullAuthSDK

# Configure App Credentials from Null-Auth Dashboard
APP_ID = "NA-48392017"                  # Replace with your App ID
APP_SECRET = "nas_YOUR_APP_SECRET_HERE" # Replace with your App Secret
API_URL = "https://null-auth-backend.vercel.app"

def main():
    print("=================================================")
    print("      🛡️ Null-Auth Console Application Sample    ")
    print("=================================================")

    sdk = NullAuthSDK(APP_ID, APP_SECRET, API_URL)
    user_sid = sdk.get_windows_user_sid()

    print(f"\n[+] Detected Windows User SID: {user_sid}")
    print("\nSelect Authentication Method:")
    print("  1. Method 1: License Key + Bound Machine SID")
    print("  2. Method 2: HWID Whitelist Only (No License Key)")

    choice = input("\nEnter Choice (1 or 2): ").strip()

    if choice == "1":
        license_key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()
        print("\n[*] Authenticating License Key with Null-Auth Cloud Server...")
        result = sdk.authenticate_license(license_key)
    else:
        print("\n[*] Authenticating HWID Whitelist with Null-Auth Cloud Server...")
        result = sdk.authenticate_hwid()

    print("\n-------------------------------------------------")
    print("[Server Raw Response]:")
    print(json.dumps(result, indent=2))

    if result.get("success"):
        data = result.get("data", {})
        print("\n[+] ACCESS GRANTED! Application Successfully Unlocked.")
        print(f"    Status: {data.get('status')}")
        print(f"    Expires At: {data.get('expires_at')}")
        print(f"    Remaining: {data.get('remaining_days')} Days")
    else:
        reason = result.get("message", "Authentication Failed")
        print(f"\n[-] ACCESS DENIED! Reason: {reason}")

    print("-------------------------------------------------")
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
