import sys
import os
import platform
import subprocess
import ctypes
import json
import urllib.request
import urllib.error
import hashlib
import hmac
import time
import threading

def check_anti_debug():
    if sys.gettrace() is not None:
        if platform.system() == "Windows":
            ctypes.windll.user32.MessageBoxW(0, "Debugger detected! Execution terminated.", "Security Violation", 16)
        os._exit(0xDEB)
    if platform.system() == "Windows":
        try:
            if ctypes.windll.kernel32.IsDebuggerPresent():
                ctypes.windll.user32.MessageBoxW(0, "Debugger detected! Execution terminated.", "Security Violation", 16)
                os._exit(0xDEB)
            is_remote = ctypes.c_bool(False)
            ctypes.windll.kernel32.CheckRemoteDebuggerPresent(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(is_remote))
            if is_remote.value:
                ctypes.windll.user32.MessageBoxW(0, "Remote debugger detected! Execution terminated.", "Security Violation", 16)
                os._exit(0xDEB)
        except Exception:
            pass

class UserData:
    def __init__(self, data: dict = None):
        if not data: data = {}
        self.status = str(data.get("status", "unknown"))
        self.client_name = str(data.get("client_name", "") or "")
        self.ip = str(data.get("ip", "") or "")
        self.expires = str(data.get("expires_at", "") or "")
        self.remaining_days = int(data.get("remaining_days", 0)) if str(data.get("remaining_days", 0)).isdigit() else 0
        self.first_activated = str(data.get("first_activated_at", "") or "")
        self.hwid = str(data.get("hwid", "") or "")
        self.version = str(data.get("version", "") or "")
        self.session_token = str(data.get("session_token", "") or "")

class NullAuth:
    def __init__(self, app_id: str, secret: str, version: str = "1.0.0", server_url: str = "https://nullauthbackend.vercel.app"):
        self.app_id = str(app_id).strip()
        self.secret = str(secret).strip()
        self.version = str(version).strip()
        self.server_url = server_url.rstrip("/")
        self.user_data = UserData()

    @staticmethod
    def get_hwid() -> str:
        if platform.system() == "Windows":
            machine_guid = ""
            vol_serial = ""
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\\Microsoft\\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
                    machine_guid = str(winreg.QueryValueEx(key, "MachineGuid")[0]).strip()
            except Exception:
                pass
            try:
                kernel32 = ctypes.windll.kernel32
                vol_serial_val = ctypes.c_ulong()
                if kernel32.GetVolumeInformationW("C:\\", None, 0, ctypes.byref(vol_serial_val), None, None, None, 0):
                    vol_serial = f"{vol_serial_val.value:08X}"
            except Exception:
                pass
            raw_str = f"{machine_guid}:{vol_serial}"
            if not machine_guid and not vol_serial:
                raw_str = platform.node()
            return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
        else:
            return hashlib.sha256(platform.node().encode('utf-8')).hexdigest()

    def _verify_signature(self, identifier: str, status: str, expires_at: str, timestamp: int, nonce: str, signature: str) -> bool:
        if not signature or not nonce or not timestamp: return False
        if abs(time.time() - timestamp) > 300: return False
        norm_app_id = self.app_id.replace("NA-", "").strip()
        norm_secret = self.secret.replace("nas_", "").strip()
        payload = f"{norm_app_id}:{identifier}:{timestamp}:{nonce}:{status}:{expires_at}"
        expected = hmac.new(norm_secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected.lower(), signature.lower())

    def _start_heartbeat(self, session_token: str, hwid: str):
        def worker():
            while True:
                time.sleep(45)
                check_anti_debug()
                try:
                    hb_url = f"{self.server_url}/api/v1/client/auth/heartbeat"
                    hb_body = json.dumps({"appId": self.app_id, "appSecret": self.secret, "sessionToken": session_token, "hwid": hwid}).encode('utf-8')
                    req = urllib.request.Request(hb_url, data=hb_body, headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"}, method="POST")
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        res = json.loads(resp.read().decode('utf-8'))
                        if res.get("kill", False):
                            if platform.system() == "Windows":
                                ctypes.windll.user32.MessageBoxW(0, "Session revoked, paused, or expired by administrator.", "Access Terminated", 16)
                            os._exit(0xDEAD)
                except urllib.error.HTTPError as e:
                    try:
                        err_res = json.loads(e.read().decode('utf-8'))
                        if err_res.get("kill", False):
                            if platform.system() == "Windows":
                                ctypes.windll.user32.MessageBoxW(0, err_res.get("message", "Session revoked."), "Access Terminated", 16)
                            os._exit(0xDEAD)
                    except Exception: pass
                except Exception: pass
        t = threading.Thread(target=worker, daemon=True)
        t.start()

    def _send_request(self, endpoint: str, payload: dict, identifier: str, show_msgbox: bool = True) -> bool:
        check_anti_debug()
        req = urllib.request.Request(endpoint, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                data = json.loads(res.read().decode('utf-8'))
                if data.get("success"):
                    d = data.get("data", {})
                    status = d.get("status", "active")
                    exp = d.get("expires_at", "")
                    ts = d.get("timestamp", 0)
                    nonce = d.get("nonce", "")
                    sig = d.get("signature", "")
                    token = d.get("session_token", "")
                    if not self._verify_signature(identifier, status, exp, ts, nonce, sig):
                        if show_msgbox and platform.system() == "Windows":
                            ctypes.windll.user32.MessageBoxW(0, "HMAC signature mismatch! Response tampering detected.", "Security Violation", 16)
                        return False
                    self.user_data = UserData(d)
                    self._start_heartbeat(token, payload.get("hwid", ""))
                    return True
                if show_msgbox and platform.system() == "Windows":
                    ctypes.windll.user32.MessageBoxW(0, data.get("message", "Error"), "Null-Auth Error", 16)
        except Exception as e:
            if show_msgbox and platform.system() == "Windows":
                ctypes.windll.user32.MessageBoxW(0, str(e), "Null-Auth Network Error", 16)
        return False

    def license(self, key: str, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        payload = {"appId": self.app_id, "appSecret": self.secret, "licenseKey": key.strip(), "hwid": hwid, "version": self.version}
        return self._send_request(f"{self.server_url}/api/v1/client/auth/license", payload, key.strip(), show_msgbox)

    def check_hwid(self, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        payload = {"appId": self.app_id, "appSecret": self.secret, "hwid": hwid, "version": self.version}
        return self._send_request(f"{self.server_url}/api/v1/client/auth/hwid", payload, hwid, show_msgbox)

    def user_login(self, username: str, password: str, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        payload = {"appId": self.app_id, "appSecret": self.secret, "username": username.strip(), "password": password.strip(), "hwid": hwid, "version": self.version}
        return self._send_request(f"{self.server_url}/api/v1/client/auth/user", payload, username.strip(), show_msgbox)

if __name__ == "__main__":
    check_anti_debug()
    auth = NullAuth("13026130", "YOUR_RAW_SECRET", "1.0.0", "https://nullauthbackend.vercel.app")
    print("Select Authentication Mode:")
    print("1. License Key Authentication")
    print("2. User Account Login (Username & Password)")
    print("3. Hardware ID (HWID) Whitelist Check")
    mode = input("Select Mode (1-3): ").strip()
    success = False
    if mode == "1":
        key = input("Enter License Key: ").strip()
        success = auth.license(key)
    elif mode == "2":
        u = input("Enter Username: ").strip()
        p = input("Enter Password: ").strip()
        success = auth.user_login(u, p)
    elif mode == "3":
        success = auth.check_hwid()
    else:
        print("Invalid mode selection!")
        sys.exit(1)
    if success:
        print(f"\n[+] Access Granted to {auth.user_data.client_name}!")
        print(f"[+] Days Remaining: {auth.user_data.remaining_days}")
        print("[+] HMAC-SHA256: VERIFIED")
        print("[+] 45s Heartbeat Remote Kill: RUNNING")
    else:
        print("\n[-] ACCESS DENIED!")
        sys.exit(1)
    input("\nPress Enter to exit...")
