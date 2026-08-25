#!/usr/bin/env python3
"""
Null-Auth Python Integration Client
Demonstrates obtaining Windows User SID and authenticating with Null-Auth REST API.
"""

import sys
import subprocess
import json
import urllib.request
import urllib.error

class NullAuthClient:
    def __init__(self, api_base_url: str, app_id: str, app_secret: str):
        self.api_base_url = api_base_url.rstrip('/')
        self.app_id = app_id
        self.app_secret = app_secret

    @staticmethod
    def get_windows_user_sid() -> str:
        """
        Retrieves the current Windows User SID using legitimate 'whoami /user' command.
        """
        try:
            output = subprocess.check_output(["whoami", "/user"], text=True)
            for line in output.splitlines():
                if "S-1-5-" in line:
                    parts = line.split()
                    if parts:
                        return parts[-1].strip()
        except Exception as e:
            print(f"[Null-Auth Warning] Could not execute whoami /user: {e}", file=sys.stderr)

        return "UNKNOWN_HWID"

    def authenticate_license(self, license_key: str) -> dict:
        """
        Authenticate client using App ID + Secret + License Key + Windows HWID
        """
        hwid = self.get_windows_user_sid()
        url = f"{self.api_base_url}/api/v1/client/license/authenticate"
        
        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
            "licenseKey": license_key,
            "hwid": hwid
        }

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "NullAuthPythonClient/1.0"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req) as response:
                res_data = response.read().decode('utf-8')
                return json.loads(res_data)
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8')
            try:
                return json.loads(error_data)
            except Exception:
                return {"success": False, "message": f"HTTP Error {e.code}", "error": str(e)}
        except Exception as e:
            return {"success": False, "message": "Network connection error", "error": str(e)}

    def authenticate_hwid(self) -> dict:
        """
        Authenticate client using App ID + Secret + Windows HWID (App Type 2)
        """
        hwid = self.get_windows_user_sid()
        url = f"{self.api_base_url}/api/v1/client/hwid/authenticate"
        
        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
            "hwid": hwid
        }

        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "NullAuthPythonClient/1.0"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req) as response:
                res_data = response.read().decode('utf-8')
                return json.loads(res_data)
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8')
            try:
                return json.loads(error_data)
            except Exception:
                return {"success": False, "message": f"HTTP Error {e.code}", "error": str(e)}
        except Exception as e:
            return {"success": False, "message": "Network connection error", "error": str(e)}

if __name__ == "__main__":
    print("=================================================")
    print("       Null-Auth Python Integration Sample       ")
    print("=================================================")

    API_URL = "https://null-auth-dashboard.vercel.app/"
    APP_ID = "NA-11745023"
    APP_SECRET = "nas_a11d5a6604bec0b8227a8fbbc472a10722b27b66014a2634"

    client = NullAuthClient(API_URL, APP_ID, APP_SECRET)

    sid = client.get_windows_user_sid()
    print(f"[+] Detected Windows User SID: {sid}")

    license_key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()

    print("\n[*] Sending authentication request...")
    result = client.authenticate_license(license_key)

    print("\n[Result]:")
    print(json.dumps(result, indent=2))

    if result.get("success"):
        print("\n[+] ACCESS GRANTED! Application unlocked.")
    else:
        print(f"\n[-] ACCESS DENIED! Reason: {result.get('message')}")
