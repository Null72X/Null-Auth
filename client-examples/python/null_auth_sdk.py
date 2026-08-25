#!/usr/bin/env python3
"""
Null-Auth Core Client SDK Library with Automatic Version Checker
Zero-dependency Python 3 client for Null-Auth Private Licensing & Auth Platform.
Supports BOTH Auth Methods:
  1. License Key Authentication (License Key + Bound Machine SID + Version Check)
  2. HWID Whitelist Authentication (Direct Machine SID Authorization + Version Check)
"""

import subprocess
import json
import urllib.request
import urllib.error

class NullAuthSDK:
    def __init__(self, app_id: str, app_secret: str, base_url: str = "https://null-auth-backend.vercel.app"):
        self.base_url = base_url.rstrip('/')
        self.app_id = app_id
        self.app_secret = app_secret

    @staticmethod
    def get_windows_user_sid() -> str:
        """
        Retrieves the Windows User SID using standard 'whoami /user' command.
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

    def authenticate_license(self, license_key: str, client_version: str = "1.0.0") -> dict:
        """
        METHOD 1: License Key Authentication + Version Checker
        Validates license key, checks machine SID, and enforces client version match.
        """
        url = f"{self.base_url}/api/v1/client/license/authenticate"
        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
            "licenseKey": license_key.strip(),
            "hwid": self.get_windows_user_sid(),
            "version": client_version
        }
        return self._send_request(url, payload)

    def authenticate_hwid(self, client_version: str = "1.0.0") -> dict:
        """
        METHOD 2: HWID Whitelist Authentication + Version Checker
        Direct machine-level authorization + enforces client version match.
        """
        url = f"{self.base_url}/api/v1/client/hwid/authenticate"
        payload = {
            "appId": self.app_id,
            "appSecret": self.app_secret,
            "hwid": self.get_windows_user_sid(),
            "version": client_version
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
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                error_resp = json.loads(e.read().decode('utf-8'))
                return error_resp
            except Exception:
                return {"success": False, "message": f"HTTP Error {e.code}", "error": "HTTP_ERROR"}
        except Exception:
            return {"success": False, "message": "Failed to connect to Null-Auth cloud server.", "error": "NETWORK_ERROR"}
