#!/usr/bin/env python3
"""
Null-Auth Ultra-Advanced Single-File Python SDK (KeyAuth-Style API)
100% Error-Free & Glitch-Free Production Build

Initialization:
    auth = NullAuth(app_id="NA-13026130", secret="nas_...", version="1.0.0")

Features:
    - License Key Authentication: auth.license("NULL-XXXX-YYYY-ZZZZ")
    - HWID Whitelist Mode: auth.check_hwid()
    - Dynamic Backend Error Response Processing & Native Popups
    - Full Access to raw & parsed User Data fields (auth.user_data)
"""

import sys
import os
import platform
import subprocess
import ctypes
import json
import urllib.request
import urllib.error


class UserData:
    """Stores all raw and parsed data fields returned from the Null-Auth cloud backend."""
    def __init__(self, data: dict = None, raw_response: dict = None):
        if not data:
            data = {}
        if not raw_response:
            raw_response = {}

        self.raw_data = data
        self.raw_response = raw_response

        # Common parsed properties
        self.status = str(data.get("status", "unknown"))
        self.expires = str(data.get("expires_at", ""))
        self.remaining_days = int(data.get("remaining_days", 0)) if str(data.get("remaining_days", 0)).isdigit() else 0
        self.first_activated = str(data.get("first_activated_at", ""))
        self.hwid = str(data.get("hwid", ""))
        self.version = str(data.get("version", ""))
        self.download_url = str(data.get("downloadUrl", "")) if data.get("downloadUrl") else None

    def get(self, key: str, default=None):
        """Allows dynamic access to any field returned in response data."""
        return self.raw_data.get(key, self.raw_response.get(key, default))


class NullAuth:
    def __init__(
        self,
        app_id: str = "NA-13026130",
        secret: str = "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
        version: str = "1.0.0",
        server_url: str = "https://null-auth-backend.vercel.app"
    ):
        self.app_id = str(app_id).strip()
        self.secret = str(secret).strip()
        self.version = str(version).strip()
        self.server_url = server_url.rstrip("/")
        self.user_data = UserData()
        self.last_response = {}
        self.initialized = False

    @staticmethod
    def get_windows_user_sid() -> str:
        """Retrieves the Windows User Security Identifier (S-1-5-21-...) via whoami /user safely."""
        if platform.system() == "Windows":
            try:
                output = subprocess.check_output("whoami /user", shell=True, stderr=subprocess.DEVNULL, timeout=5).decode(errors='ignore')
                for line in output.splitlines():
                    if "S-1-5-" in line:
                        for part in line.split():
                            if part.startswith("S-1-5-"):
                                return part.strip()
            except Exception:
                pass
        return "UNKNOWN_HWID"

    @staticmethod
    def show_popup(title: str, message: str, icon_type: int = 16):
        """Native Windows MessageBox popup window alert (icon_type 16 = MB_ICONERROR, 48 = MB_ICONWARNING)."""
        if platform.system() == "Windows":
            try:
                ctypes.windll.user32.MessageBoxW(0, str(message), str(title), icon_type | 0x00000000)
            except Exception:
                print(f"[{title}] {message}")
        else:
            print(f"[{title}] {message}")

    def handle_server_error(self, response_dict: dict, show_msgbox: bool = True):
        """Dynamically extracts error code and server message from backend response to display in popup."""
        if not show_msgbox:
            return

        err_code = str(response_dict.get("error", "AUTH_FAILED"))
        server_msg = str(response_dict.get("message", "Authentication request failed."))

        # Map error codes to clean window header titles
        titles = {
            "VERSION_MISMATCH": "Update Required",
            "LICENSE_EXPIRED": "License Expired",
            "IDENTIFIER_EXPIRED": "License Expired",
            "LICENSE_BANNED": "Account Banned",
            "IDENTIFIER_BANNED": "Account Banned",
            "LICENSE_PAUSED": "Access Paused",
            "IDENTIFIER_PAUSED": "Access Paused",
            "HWID_MISMATCH": "HWID Mismatch",
            "LICENSE_NOT_FOUND": "Invalid Key / HWID",
            "IDENTIFIER_NOT_FOUND": "Invalid Key / HWID",
            "APPLICATION_DISABLED": "Application Paused",
            "INVALID_APP_CREDENTIALS": "App Credential Error",
        }

        title = titles.get(err_code, "Null-Auth Security Alert")
        popup_msg = server_msg

        data = response_dict.get("data")
        download_url = data.get("downloadUrl") if isinstance(data, dict) else None

        if err_code == "VERSION_MISMATCH" and download_url:
            popup_msg += f"\n\nDownload Update: {download_url}"

        icon = 48 if err_code in ["VERSION_MISMATCH", "LICENSE_PAUSED", "IDENTIFIER_PAUSED", "APPLICATION_DISABLED"] else 16
        self.show_popup(title, popup_msg, icon)

    def init(self) -> bool:
        """Connects to Null-Auth server health endpoint."""
        url = f"{self.server_url}/health"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NullAuthClient/2.0"})
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
                if response.status == 200 and data.get("status") == "ok":
                    self.initialized = True
                    return True
        except Exception:
            pass
        self.initialized = False
        return False

    def license(self, key: str, show_msgbox: bool = True) -> bool:
        """METHOD 1: License Key Authentication + Bound Windows User SID + Version Check."""
        sid = self.get_windows_user_sid()
        url = f"{self.server_url}/api/v1/client/license/authenticate"
        payload = {
            "appId": self.app_id,
            "appSecret": self.secret,
            "licenseKey": key.strip(),
            "hwid": sid,
            "version": self.version
        }

        res_dict = self._send_request(url, payload)
        self.last_response = res_dict

        if res_dict.get("success"):
            data = res_dict.get("data") if isinstance(res_dict.get("data"), dict) else {}
            data["hwid"] = sid
            data["version"] = self.version
            self.user_data = UserData(data, res_dict)
            return True

        self.handle_server_error(res_dict, show_msgbox)
        return False

    def check_hwid(self, show_msgbox: bool = True) -> bool:
        """METHOD 2: HWID Direct Whitelist Authentication + Version Check."""
        sid = self.get_windows_user_sid()
        url = f"{self.server_url}/api/v1/client/hwid/authenticate"
        payload = {
            "appId": self.app_id,
            "appSecret": self.secret,
            "hwid": sid,
            "version": self.version
        }

        res_dict = self._send_request(url, payload)
        self.last_response = res_dict

        if res_dict.get("success"):
            data = res_dict.get("data") if isinstance(res_dict.get("data"), dict) else {}
            data["hwid"] = sid
            data["version"] = self.version
            self.user_data = UserData(data, res_dict)
            return True

        self.handle_server_error(res_dict, show_msgbox)
        return False

    def _send_request(self, url: str, payload: dict) -> dict:
        """Sends HTTP POST request safely and returns parsed JSON response dict."""
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode('utf-8'))
            except Exception:
                return {"success": False, "message": f"Server HTTP Error {e.code}", "error": "HTTP_ERROR"}
        except Exception as e:
            return {"success": False, "message": f"Failed to connect to Null-Auth cloud server: {str(e)}", "error": "NETWORK_ERROR"}


# =============================================================================
# RUNNABLE USAGE SAMPLE
# =============================================================================
if __name__ == "__main__":
    print("=================================================")
    print("      🛡️ Null-Auth Single-File Python Client      ")
    print("=================================================")

    # Initialize Null-Auth Client (app_id, secret, version)
    auth = NullAuth(
        app_id="NA-13026130",
        secret="nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
        version="1.0.0"
    )

    print("\n[*] Initializing connection to Null-Auth server...")
    if not auth.init():
        auth.show_popup("Connection Error", "Failed to connect to Null-Auth server.", 16)
        sys.exit(1)

    print(f"[+] Server Connected! Local Version: {auth.version}")
    print(f"[+] Detected Windows User SID: {auth.get_windows_user_sid()}")

    print("\nSelect Authentication Method:")
    print("  1. Method 1: License Key + Bound Machine SID")
    print("  2. Method 2: HWID Whitelist Only (No License Key)")

    choice = input("\nEnter Choice (1 or 2): ").strip()

    if choice == "1":
        key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()
        success = auth.license(key, show_msgbox=True)
    else:
        success = auth.check_hwid(show_msgbox=True)

    if success:
        print("\n[+] ACCESS GRANTED! Software Unlocked.")
        print(f"    Status: {auth.user_data.status}")
        print(f"    Expires: {auth.user_data.expires}")
        print(f"    Days Left: {auth.user_data.remaining_days}")
    else:
        print("\n[-] ACCESS DENIED!")
        sys.exit(1)

    input("\nPress Enter to exit...")
