#!/usr/bin/env python3
"""
Null-Auth Console Application Sample (Python) with Version Checker
Demonstrates a clean Console Application implementing BOTH Auth Methods + Version Checking:
  - Method 1: License Key Authentication + Version Validation
  - Method 2: Direct HWID Whitelist Authentication + Version Validation
"""

import sys
import json
from null_auth_sdk import NullAuthSDK

# Configure App Credentials & Current Client Version
APP_ID = "NA-48392017"                  # Replace with your App ID
APP_SECRET = "nas_YOUR_APP_SECRET_HERE" # Replace with your App Secret
API_URL = "https://null-auth-backend.vercel.app"
APP_VERSION = "1.0.0"                   # Current local application version

def main():
    print("=================================================")
    print("    🛡️ Null-Auth Console App (Version " + APP_VERSION + ")     ")
    print("=================================================")

    sdk = NullAuthSDK(APP_ID, APP_SECRET, API_URL)
    user_sid = sdk.get_windows_user_sid()

    print(f"\n[+] Detected Windows User SID: {user_sid}")
    print(f"[+] Client Version: {APP_VERSION}")

    print("\nSelect Authentication Method:")
    print("  1. Method 1: License Key + Bound Machine SID")
    print("  2. Method 2: HWID Whitelist Only (No License Key)")

    choice = input("\nEnter Choice (1 or 2): ").strip()

    if choice == "1":
        license_key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()
        print("\n[*] Authenticating License Key with Null-Auth Cloud Server...")
        result = sdk.authenticate_license(license_key, client_version=APP_VERSION)
    else:
        print("\n[*] Authenticating HWID Whitelist with Null-Auth Cloud Server...")
        result = sdk.authenticate_hwid(client_version=APP_VERSION)

    print("\n-------------------------------------------------")

    # Check for Version Mismatch
    if result.get("error") == "VERSION_MISMATCH":
        required_ver = result.get("data", {}).get("requiredVersion", "Unknown")
        download_url = result.get("data", {}).get("downloadUrl")
        print("\n[!] CRITICAL: VERSION MISMATCH DETECTED!")
        print(f"    Your App Version: {APP_VERSION}")
        print(f"    Required Version: {required_ver}")
        if download_url:
            print(f"    Download Update: {download_url}")
        print("\n[-] EXECUTION TERMINATED: Application is outdated.")
        sys.exit(1)

    if result.get("success"):
        data = result.get("data", {})
        print("\n[+] ACCESS GRANTED! Application Successfully Unlocked.")
        print(f"    Status: {data.get('status')}")
        print(f"    Expires At: {data.get('expires_at')}")
        print(f"    Remaining: {data.get('remaining_days')} Days")
    else:
        reason = result.get("message", "Authentication Failed")
        print(f"\n[-] ACCESS DENIED! Reason: {reason}")
        sys.exit(1)

    print("-------------------------------------------------")
    print("\n[+] Starting Main Software Application Payload...")
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
