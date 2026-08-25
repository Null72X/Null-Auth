#!/usr/bin/env python3
"""
Null-Auth Single-File Python SDK (KeyAuth-Style API)
Zero-dependency Python 3 client for Null-Auth Private Licensing & Auth Platform.

Initialization:
    auth = NullAuth(app_id="NA-13026130", secret="nas_...", version="1.0.0")

Features:
    - License Key Authentication: auth.license("NULL-XXXX-YYYY-ZZZZ")
    - HWID Whitelist Mode: auth.check_hwid()
    - Dynamic Server Message Popups on Failure (Version Mismatch, Expired, Banned, Paused, HWID Mismatch, Disabled)
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
    """Stores authenticated client session details."""
    def __init__(self, data: dict = None):
        if not data:
            data = {}
        self.status = data.get("status", "unknown")
        self.expires = data.get("expires_at", "")
        self.remaining_days = data.get("remaining_days", 0)
        self.first_activated = data.get("first_activated_at", "")
        self.hwid = data.get("hwid", "")
        self.version = data.get("version", "")


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
        self.initialized = False

    @staticmethod
    def get_windows_user_sid() -> str:
        """Retrieves the Windows User Security Identifier (S-1-5-21-...) via whoami /user."""
        if platform.system() == "Windows":
            try:
                output = subprocess.check_output("whoami /user", shell=True, stderr=subprocess.DEVNULL).decode()
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
                ctypes.windll.user32.MessageBoxW(0, message, title, icon_type | 0x00000000)
            except Exception:
                print(f"[{title}] {message}")
        else:
            print(f"[{title}] {message}")

    def handle_error(self, err_code: str, server_message: str, download_url: str = None, show_msgbox: bool = True):
        """Displays native Windows popup using exact error message sent from backend server."""
        if not show_msgbox:
            return

        titles = {
            "VERSION_MISMATCH": "Update Required",
            "LICENSE_EXPIRED": "License Expired",
            "IDENTIFIER_EXPIRED": "License Expired",
            "LICENSE_BANNED": "Account Banned",
            "IDENTIFIER_BANNED": "Account Banned",
            "LICENSE_PAUSED": "Access Paused",
            "IDENTIFIER_PAUSED": "Access Paused",
            "HWID_MISMATCH": "HWID Mismatch",
            "LICENSE_NOT_FOUND": "Invalid License Key",
            "IDENTIFIER_NOT_FOUND": "Unauthorized Machine",
            "APPLICATION_DISABLED": "Application Paused",
            "INVALID_APP_CREDENTIALS": "App Credential Error",
        }

        title = titles.get(err_code, "Null-Auth Security Alert")
        popup_msg = server_message

        if err_code == "VERSION_MISMATCH":
            if download_url:
                popup_msg += f"\n\nDownload Update: {download_url}"
            self.show_popup(title, popup_msg, 48)  # MB_ICONWARNING
        elif err_code in ["LICENSE_PAUSED", "IDENTIFIER_PAUSED", "APPLICATION_DISABLED"]:
            self.show_popup(title, popup_msg, 48)  # MB_ICONWARNING
        else:
            self.show_popup(title, popup_msg, 16)  # MB_ICONERROR

    def init(self) -> bool:
        """KeyAuth-style init(): Connects to server health endpoint."""
        url = f"{self.server_url}/health"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NullAuth/1.0"})
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

        res = self._send_request(url, payload)
        if res.get("success"):
            u_data = res.get("data", {})
            u_data["hwid"] = sid
            u_data["version"] = self.version
            self.user_data = UserData(u_data)
            return True

        server_msg = res.get("message", "Authentication Failed")
        err_code = res.get("error", "AUTH_FAILED")
        download_url = res.get("data", {}).get("downloadUrl") if isinstance(res.get("data"), dict) else None

        self.handle_error(err_code, server_msg, download_url, show_msgbox)
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

        res = self._send_request(url, payload)
        if res.get("success"):
            u_data = res.get("data", {})
            u_data["hwid"] = sid
            u_data["version"] = self.version
            self.user_data = UserData(u_data)
            return True

        server_msg = res.get("message", "HWID Authorization Failed")
        err_code = res.get("error", "AUTH_FAILED")
        download_url = res.get("data", {}).get("downloadUrl") if isinstance(res.get("data"), dict) else None

        self.handle_error(err_code, server_msg, download_url, show_msgbox)
        return False

    def _send_request(self, url: str, payload: dict) -> dict:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "NullAuthPythonSDK/1.0"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read().decode('utf-8'))
            except Exception:
                return {"success": False, "message": f"HTTP Error {e.code}", "error": "HTTP_ERROR"}
        except Exception:
            return {"success": False, "message": "Failed to connect to Null-Auth cloud server.", "error": "NETWORK_ERROR"}


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
