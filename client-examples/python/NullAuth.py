#!/usr/bin/env python3
"""
Null-Auth Single File Python SDK (KeyAuth-Style API)
Zero-dependency Python 3 client for Null-Auth Private Licensing & Auth Platform.

Supports BOTH Auth Methods:
  1. License Key Authentication (License Key + Bound Machine SID + Version Check)
  2. HWID Whitelist Authentication (Direct Machine SID Authorization + Version Check)
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
        name: str = "MyApplication",
        app_id: str = "NA-13026130",
        secret: str = "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
        version: str = "1.0.0",
        server_url: str = "https://null-auth-backend.vercel.app"
    ):
        self.name = name
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
        if platform.system() == "Windows":
            try:
                ctypes.windll.user32.MessageBoxW(0, message, title, icon_type | 0x00000000)
            except Exception:
                print(f"[{title}] {message}")
        else:
            print(f"[{title}] {message}")

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
        """METHOD 1: License Key Authentication + Bound Windows User SID."""
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

        err_msg = res.get("message", "Authentication Failed")
        err_code = res.get("error", "")

        if show_msgbox:
            if err_code == "VERSION_MISMATCH":
                self.show_popup("Update Required", f"Update Available!\n{err_msg}", 16)
            else:
                self.show_popup("Null-Auth Security Alert", f"Access Denied: {err_msg}", 16)
        return False

    def check_hwid(self, show_msgbox: bool = True) -> bool:
        """METHOD 2: HWID Direct Whitelist Authentication."""
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

        err_msg = res.get("message", "HWID Authorization Failed")
        err_code = res.get("error", "")

        if show_msgbox:
            if err_code == "VERSION_MISMATCH":
                self.show_popup("Update Required", f"Update Available!\n{err_msg}", 16)
            else:
                self.show_popup("Null-Auth Security Alert", f"Access Denied: {err_msg}", 16)
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

    # Initialize Null-Auth Client (KeyAuth Style)
    auth = NullAuth(
        name="MyApplication",
        app_id="NA-13026130",
        secret="nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
        version="1.0.0"
    )

    print("\n[*] Initializing connection to Null-Auth server...")
    if not auth.init():
        print("[-] Server offline or connection error!")
        sys.exit(1)

    print(f"[+] Server Connected! Local Version: {auth.version}")
    print(f"[+] Detected Windows User SID: {auth.get_windows_user_sid()}")

    print("\nSelect Authentication Method:")
    print("  1. Method 1: License Key + Bound Machine SID")
    print("  2. Method 2: HWID Whitelist Only (No License Key)")

    choice = input("\nEnter Choice (1 or 2): ").strip()

    if choice == "1":
        key = input("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ").strip()
        success = auth.license(key)
    else:
        success = auth.check_hwid()

    if success:
        print("\n[+] ACCESS GRANTED! Software Unlocked.")
        print(f"    Status: {auth.user_data.status}")
        print(f"    Expires: {auth.user_data.expires}")
        print(f"    Days Left: {auth.user_data.remaining_days}")
    else:
        print("\n[-] ACCESS DENIED!")
        sys.exit(1)

    input("\nPress Enter to exit...")
