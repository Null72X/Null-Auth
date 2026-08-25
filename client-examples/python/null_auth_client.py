#!/usr/bin/env python3
"""
Null-Auth Python Client SDK
Zero-dependency Python 3 integration client for Null-Auth Private Licensing & Auth Platform.
"""

import sys
import subprocess
import json
import urllib.request
import urllib.error

class NullAuthSDK:
    def __init__(self, app_id: str, app_secret: str, api_base_url: str = "https://null-auth-backend.vercel.app"):
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
        except Exception:
            pass

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
            "licenseKey": license_key.strip(),
            "hwid": hwid
        }

        return self._send_request(url, payload)

    def authenticate_hwid(self) -> dict:
        """
        Authenticate client using App ID + Secret + Windows HWID (HWID Whitelist Mode)
        """
        hwid = self.get_windows_user_sid()
        url = f"{self.api_base_url}/api/v1/client/hwid/authenticate"
        
        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
            "hwid": hwid
        }

        return self._send_request(url, payload)

    def _send_request(self, url: str, payload: dict) -> dict:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "NullAuthPythonSDK/1.0"},
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
                return {"success": False, "message": f"HTTP Error {e.code}", "error": f"HTTP_{e.code}"}
        except Exception as e:
            return {"success": False, "message": "Failed to connect to Null-Auth cloud server.", "error": "NETWORK_ERROR"}

if __name__ == "__main__":
    print("=================================================")
    print("       Null-Auth Python Integration SDK          ")
    print("=================================================")

    # Configure your App ID and Secret Key from Null-Auth Dashboard
    API_URL = "https://null-auth-backend.vercel.app"
    APP_ID = "NA-13026130"
    APP_SECRET = "nas_a11d5a6604bec0b8227a8fbbc472a10722b27b66014a2634"

    sdk = NullAuthSDK(APP_ID, APP_SECRET, API_URL)

    sid = sdk.get_windows_user_sid()
    print(f"[+] Detected Windows User SID: {sid}")

    license_key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()

    print("\n[*] Sending authentication request...")
    result = sdk.authenticate_license(license_key)

    print("\n[Result]:")
    print(json.dumps(result, indent=2))

    if result.get("success"):
        print(f"\n[+] ACCESS GRANTED! Status: {result.get('data', {}).get('status')}")
    else:
        print(f"\n[-] ACCESS DENIED! Reason: {result.get('message')}")
