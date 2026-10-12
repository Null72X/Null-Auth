'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import {
  Lock,
  Shield,
  Server,
  Check,
  AlertCircle,
  Code,
  Copy,
  Terminal,
  Cpu,
  Globe,
  Download,
  FileCode,
  Sparkles,
  Bell,
  Send,
  Eye,
  EyeOff,
  Laptop,
  CheckCircle2,
  HardDrive,
  Key,
} from 'lucide-react';

const CSHARP_SDK = `using System;
using System.Diagnostics;
using System.Net.Http;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace NullAuthClient
{
    public class UserData
    {
        public string Status { get; set; } = "unknown";
        public string ClientName { get; set; } = "";
        public string Expires { get; set; } = "";
        public int RemainingDays { get; set; } = 0;
        public string FirstActivated { get; set; } = "";
        public string Hwid { get; set; } = "";
        public string Version { get; set; } = "";
        public string Ip { get; set; } = "";
    }

    public class NullAuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string ErrorCode { get; set; }
        public string DownloadUrl { get; set; }
        public UserData Data { get; set; }
    }

    /// <summary>
    /// Ultra-Advanced Single-File C# SDK (NativeAOT & Trimming Safe)
    /// Initialization: new NullAuth(appId, secret, version)
    /// </summary>
    public class NullAuth
    {
        public string AppId { get; }
        public string Secret { get; }
        public string Version { get; }
        public string ServerUrl { get; }
        public UserData UserData { get; private set; } = new UserData();
        public bool Initialized { get; private set; } = false;

        private static readonly HttpClient _http = new HttpClient();

        public NullAuth(string appId, string secret, string version = "1.0.0", string serverUrl = "https://nullauthbackend.vercel.app")
        {
            AppId = appId?.Trim() ?? "";
            Secret = secret?.Trim() ?? "";
            Version = version?.Trim() ?? "1.0.0";
            ServerUrl = serverUrl?.TrimEnd('/') ?? "https://nullauthbackend.vercel.app";
        }

        [System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true, CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern bool GetVolumeInformation(
            string rootPathName,
            StringBuilder volumeNameBuffer,
            int volumeNameSize,
            out uint volumeSerialNumber,
            out uint maximumComponentLength,
            out uint fileSystemFlags,
            StringBuilder fileSystemNameBuffer,
            int fileSystemNameSize);

        public static string GetHwid()
        {
            try
            {
                string machineGuid = "";
                try
                {
                    using var key = Microsoft.Win32.RegistryKey.OpenBaseKey(
                        Microsoft.Win32.RegistryHive.LocalMachine,
                        Environment.Is64BitOperatingSystem ? Microsoft.Win32.RegistryView.Registry64 : Microsoft.Win32.RegistryView.Registry32);
                    using var subKey = key.OpenSubKey(@"SOFTWARE\\Microsoft\\Cryptography");
                    if (subKey != null) machineGuid = subKey.GetValue("MachineGuid")?.ToString()?.Trim() ?? "";
                }
                catch { }

                uint volumeSerial = 0;
                try { GetVolumeInformation("C:\\\\", null, 0, out volumeSerial, out _, out _, null, 0); }
                catch { }

                string rawHwid = $"{machineGuid}:{volumeSerial:X8}";
                if (string.IsNullOrWhiteSpace(machineGuid) && volumeSerial == 0)
                {
                    try { rawHwid = WindowsIdentity.GetCurrent().User?.Value ?? Environment.MachineName; }
                    catch { rawHwid = Environment.MachineName; }
                }

                using var sha256 = System.Security.Cryptography.SHA256.Create();
                byte[] bytes = Encoding.UTF8.GetBytes(rawHwid);
                byte[] hash = sha256.ComputeHash(bytes);
                var sb = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
            catch { return "UNKNOWN_HWID"; }
        }

        public static string GetWindowsUserSid() => GetHwid();

        public static void ShowPopup(string title, string message, MessageBoxIcon icon = MessageBoxIcon.Error)
        {
            try
            {
                MessageBox.Show(message, title, MessageBoxButtons.OK, icon);
            }
            catch
            {
                Console.WriteLine($"[{title}] {message}");
            }
        }

        private void HandleError(string errCode, string serverMessage, string downloadUrl, bool showMsgbox)
        {
            if (!showMsgbox) return;

            string title = "Null-Auth Security Alert";
            if (errCode == "VERSION_MISMATCH") title = "Update Required";
            else if (errCode == "LICENSE_EXPIRED" || errCode == "IDENTIFIER_EXPIRED") title = "License Expired";
            else if (errCode == "LICENSE_BANNED" || errCode == "IDENTIFIER_BANNED") title = "Account Banned";
            else if (errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED") title = "Access Paused";
            else if (errCode == "HWID_MISMATCH") title = "HWID Mismatch";
            else if (errCode == "LICENSE_NOT_FOUND" || errCode == "IDENTIFIER_NOT_FOUND") title = "Invalid Key / HWID";
            else if (errCode == "APPLICATION_DISABLED") title = "Application Paused";

            string popupMsg = string.IsNullOrEmpty(serverMessage) ? "Authentication request failed." : serverMessage;
            if (errCode == "VERSION_MISMATCH" && !string.IsNullOrEmpty(downloadUrl))
            {
                popupMsg += $"\\n\\nDownload Update: {downloadUrl}";
            }

            MessageBoxIcon icon = (errCode == "VERSION_MISMATCH" || errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED" || errCode == "APPLICATION_DISABLED")
                ? MessageBoxIcon.Warning
                : MessageBoxIcon.Error;

            ShowPopup(title, popupMsg, icon);
        }

        public async Task<bool> InitAsync()
        {
            try
            {
                var response = await _http.GetAsync($"{ServerUrl}/health");
                if (response.IsSuccessStatusCode)
                {
                    Initialized = true;
                    return true;
                }
            }
            catch { }
            Initialized = false;
            return false;
        }

        private static string EscapeJson(string str)
        {
            if (string.IsNullOrEmpty(str)) return "";
            return str.Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"").Replace("\\n", "\\\\n").Replace("\\r", "\\\\r");
        }

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\\"appId\\":\\"{EscapeJson(AppId)}\\",\\"appSecret\\":\\"{EscapeJson(Secret)}\\",\\"licenseKey\\":\\"{EscapeJson(key?.Trim())}\\",\\"hwid\\":\\"{hwid}\\",\\"version\\":\\"{EscapeJson(Version)}\\"}}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> CheckHwidAsync(bool showMsgbox = true)
        {
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/hwid/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\\"appId\\":\\"{EscapeJson(AppId)}\\",\\"appSecret\\":\\"{EscapeJson(Secret)}\\",\\"hwid\\":\\"{hwid}\\",\\"version\\":\\"{EscapeJson(Version)}\\"}}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> UserLoginAsync(string username, string password, bool showMsgbox = true)
        {
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/user/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\\"appId\\":\\"{EscapeJson(AppId)}\\",\\"appSecret\\":\\"{EscapeJson(Secret)}\\",\\"username\\":\\"{EscapeJson(username?.Trim())}\\",\\"password\\":\\"{EscapeJson(password?.Trim())}\\",\\"hwid\\":\\"{hwid}\\",\\"version\\":\\"{EscapeJson(Version)}\\"}}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        private async Task<NullAuthResult> SendRequestAsync(string endpoint, string jsonBody)
        {
            try
            {
                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                var response = await _http.PostAsync(endpoint, content);
                string resString = await response.Content.ReadAsStringAsync();

                using JsonDocument doc = JsonDocument.Parse(resString);
                var root = doc.RootElement;

                bool success = root.GetProperty("success").GetBoolean();
                string message = root.GetProperty("message").GetString();
                string errorCode = root.TryGetProperty("error", out var err) ? err.GetString() : null;

                UserData data = null;
                string downloadUrl = null;

                if (root.TryGetProperty("data", out var d))
                {
                    if (d.ValueKind == JsonValueKind.Object)
                    {
                        if (d.TryGetProperty("downloadUrl", out var dl)) downloadUrl = dl.GetString();
                        data = new UserData
                        {
                            Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active",
                            ClientName = d.TryGetProperty("client_name", out var cn) ? cn.GetString() : "",
                            Expires = d.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                            RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                            Ip = d.TryGetProperty("ip", out var ip) ? ip.GetString() : "",
                        };
                    }
                }

                return new NullAuthResult { Success = success, Message = message, ErrorCode = errorCode, DownloadUrl = downloadUrl, Data = data };
            }
            catch (Exception ex)
            {
                return new NullAuthResult { Success = false, Message = ex.Message, ErrorCode = "NETWORK_ERROR" };
            }
        }
    }
}`;

const CPP_SDK = `#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <wincrypt.h>
#include <array>
#include <cctype>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "advapi32.lib")

namespace NullAuthClient {
    struct UserData {
        std::string status = "unknown";
        std::string clientName = "";
        std::string ip = "";
        std::string expires = "";
        int remainingDays = 0;
        std::string firstActivated = "";
        std::string hwid = "";
        std::string version = "";
    };

    class NullAuth {
    private:
        std::string appId;
        std::string secret;
        std::string version;
        std::string host;

        static std::string ExtractJsonString(const std::string& json, const std::string& key) {
            std::string search = "\\"" + key + "\\":\\"";
            size_t pos = json.find(search);
            if (pos == std::string::npos) {
                search = "\\"" + key + "\\": \\"";
                pos = json.find(search);
            }
            if (pos == std::string::npos) return "";
            size_t start = pos + search.length();
            size_t end = json.find("\\"", start);
            if (end == std::string::npos) return "";
            return json.substr(start, end - start);
        }

        static int ExtractJsonInt(const std::string& json, const std::string& key) {
            std::string search = "\\"" + key + "\\":";
            size_t pos = json.find(search);
            if (pos == std::string::npos) return 0;
            size_t start = pos + search.length();
            while (start < json.length() && (json[start] == ' ' || json[start] == '\\"')) start++;
            size_t end = start;
            while (end < json.length() && (isdigit(static_cast<unsigned char>(json[end])) || json[end] == '-')) end++;
            if (start == end) return 0;
            try { return std::stoi(json.substr(start, end - start)); } catch (...) { return 0; }
        }

    public:
        UserData userData;

        // Usage: NullAuthClient::NullAuth auth("13026130", "YOUR_RAW_SECRET", "1.0.0");
        NullAuth(const std::string& appId, const std::string& secret, const std::string& version = "1.0.0", const std::string& host = "null-auth-backend.vercel.app")
            : appId(appId), secret(secret), version(version), host(host) {}

        static std::string Sha256(const std::string& input) {
            HCRYPTPROV hProv = 0;
            HCRYPTHASH hHash = 0;
            BYTE rgbHash[32];
            DWORD cbHash = 32;
            std::string result = "";

            if (CryptAcquireContextA(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
                if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
                    if (CryptHashData(hHash, (const BYTE*)input.c_str(), (DWORD)input.length(), 0)) {
                        if (CryptGetHashParam(hHash, HP_HASHVAL, rgbHash, &cbHash, 0)) {
                            char hexDigits[] = "0123456789abcdef";
                            for (DWORD i = 0; i < cbHash; i++) {
                                result += hexDigits[(rgbHash[i] >> 4) & 0x0F];
                                result += hexDigits[rgbHash[i] & 0x0F];
                            }
                        }
                    }
                    CryptDestroyHash(hHash);
                }
                CryptReleaseContext(hProv, 0);
            }
            return result.empty() ? input : result;
        }

        static std::string GetHwid() {
            std::string machineGuid = "";
            HKEY hKey;
            if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SOFTWARE\\\\Microsoft\\\\Cryptography", 0, KEY_READ | KEY_WOW64_64KEY, &hKey) == ERROR_SUCCESS) {
                char buf[256];
                DWORD bufSize = sizeof(buf);
                if (RegQueryValueExA(hKey, "MachineGuid", NULL, NULL, (LPBYTE)buf, &bufSize) == ERROR_SUCCESS) {
                    machineGuid = std::string(buf);
                }
                RegCloseKey(hKey);
            }

            DWORD volumeSerial = 0;
            GetVolumeInformationA("C:\\\\", NULL, 0, &volumeSerial, NULL, NULL, NULL, 0);

            char volBuf[32];
            sprintf_s(volBuf, sizeof(volBuf), "%08X", volumeSerial);

            std::string raw = machineGuid + ":" + std::string(volBuf);
            if (machineGuid.empty() && volumeSerial == 0) {
                char compName[MAX_COMPUTERNAME_LENGTH + 1];
                DWORD size = sizeof(compName);
                if (GetComputerNameA(compName, &size)) raw = compName;
                else raw = "UNKNOWN_HWID";
            }

            return Sha256(raw);
        }

        static std::string GetWindowsUserSid() {
            return GetHwid();
        }

        bool License(const std::string& key, bool showMsgbox = true) {
            std::string hwid = GetHwid();
            std::string body = "{\\"appId\\":\\"" + appId + "\\",\\"appSecret\\":\\"" + secret + "\\",\\"licenseKey\\":\\"" + key + "\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"" + version + "\\"}";
            
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/client/auth/license", NULL, NULL, NULL, INTERNET_FLAG_SECURE, 0);

            std::string headers = "Content-Type: application/json\\r\\n";
            HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)body.c_str(), (DWORD)body.length());

            char buffer[2048];
            DWORD bytesRead = 0;
            std::string response = "";
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\\0';
                response += buffer;
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            if (response.find("\\"success\\":true") != std::string::npos) {
                userData.status = "active";
                userData.clientName = ExtractJsonString(response, "client_name");
                userData.ip = ExtractJsonString(response, "ip");
                userData.expires = ExtractJsonString(response, "expires_at");
                userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                userData.hwid = hwid;
                userData.version = version;
                return true;
            }
            if (showMsgbox) MessageBoxA(0, "Authentication Failed!", "Null-Auth Error", MB_ICONERROR | MB_OK);
            return false;
        }

        bool CheckHwid(bool showMsgbox = true) {
            std::string hwid = GetHwid();
            std::string body = "{\\"appId\\":\\"" + appId + "\\",\\"appSecret\\":\\"" + secret + "\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"" + version + "\\"}";
            
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/client/auth/hwid", NULL, NULL, NULL, INTERNET_FLAG_SECURE, 0);

            std::string headers = "Content-Type: application/json\\r\\n";
            HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)body.c_str(), (DWORD)body.length());

            char buffer[2048];
            DWORD bytesRead = 0;
            std::string response = "";
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\\0';
                response += buffer;
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            if (response.find("\\"success\\":true") != std::string::npos) {
                userData.status = "active";
                userData.clientName = ExtractJsonString(response, "client_name");
                userData.ip = ExtractJsonString(response, "ip");
                userData.expires = ExtractJsonString(response, "expires_at");
                userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                userData.hwid = hwid;
                userData.version = version;
                return true;
            }
            if (showMsgbox) MessageBoxA(0, "HWID Whitelist Authorization Failed!", "Null-Auth Error", MB_ICONERROR | MB_OK);
            return false;
        }

        bool UserLogin(const std::string& username, const std::string& userPassword, bool showMsgbox = true) {
            std::string hwid = GetHwid();
            std::string body = "{\\"appId\\":\\"" + appId + "\\",\\"appSecret\\":\\"" + secret + "\\",\\"username\\":\\"" + username + "\\",\\"password\\":\\"" + userPassword + "\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"" + version + "\\"}";
            
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/v1/client/user/authenticate", NULL, NULL, NULL, INTERNET_FLAG_SECURE, 0);

            std::string headers = "Content-Type: application/json\\r\\n";
            HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)body.c_str(), (DWORD)body.length());

            char buffer[2048];
            DWORD bytesRead = 0;
            std::string response = "";
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\\0';
                response += buffer;
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            if (response.find("\\"success\\":true") != std::string::npos) {
                userData.status = "active";
                userData.clientName = ExtractJsonString(response, "client_name");
                userData.ip = ExtractJsonString(response, "ip");
                userData.expires = ExtractJsonString(response, "expires_at");
                userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                userData.hwid = hwid;
                userData.version = version;
                return true;
            }
            if (showMsgbox) MessageBoxA(0, "User Authentication Failed!", "Null-Auth Error", MB_ICONERROR | MB_OK);
            return false;
        }
    };
}

int main() {
    NullAuthClient::NullAuth auth("13026130", "YOUR_RAW_SECRET", "1.0.0");
    std::cout << "Enter License Key: ";
    std::string key;
    std::cin >> key;
    if (auth.License(key)) {
        std::cout << "Access Granted to " << auth.userData.clientName << "!" << std::endl;
        std::cout << "Days Remaining: " << auth.userData.remainingDays << std::endl;
    }
    return 0;
}`;

const PYTHON_SDK = `import urllib.request, urllib.error, json, subprocess, ctypes, platform, hashlib

class UserData:
    def __init__(self, data: dict = None):
        if not data: data = {}
        self.status = str(data.get("status", "unknown"))
        self.client_name = str(data.get("client_name", "") or "")
        self.ip = str(data.get("ip", "") or "")
        self.expires = str(data.get("expires_at", "") or "")
        self.remaining_days = int(data.get("remaining_days", 0)) if str(data.get("remaining_days", 0)).isdigit() else 0
        self.first_activated = str(data.get("first_activated_at", "") or "")
        self.version = str(data.get("version", "") or "")

class NullAuth:
    # Usage: auth = NullAuth(app_id="13026130", secret="YOUR_RAW_SECRET", version="1.0.0")
    def __init__(self, app_id: str, secret: str, version: str = "1.0.0", server_url: str = "https://nullauthbackend.vercel.app"):
        self.app_id = str(app_id).strip()
        self.secret = str(secret).strip()
        self.version = str(version).strip()
        self.server_url = server_url.rstrip("/")
        self.user_data = UserData()

    @staticmethod
    def get_hwid() -> str:
        """Retrieves hardware-bound machine HWID (MachineGuid + C: Volume Serial) hashed with SHA-256."""
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
                if kernel32.GetVolumeInformationW("C:\\\\", None, 0, ctypes.byref(vol_serial_val), None, None, None, 0):
                    vol_serial = f"{vol_serial_val.value:08X}"
            except Exception:
                pass

            raw_str = f"{machine_guid}:{vol_serial}"
            if not machine_guid and not vol_serial:
                raw_str = platform.node()

            return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
        else:
            return hashlib.sha256(platform.node().encode('utf-8')).hexdigest()

    @staticmethod
    def get_windows_user_sid() -> str:
        return NullAuth.get_hwid()

    def license(self, key: str, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        url = f"{self.server_url}/api/client/auth/license"
        payload = {"appId": self.app_id, "appSecret": self.secret, "licenseKey": key.strip(), "hwid": hwid, "version": self.version}
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                data = json.loads(res.read().decode('utf-8'))
                if data.get("success"):
                    self.user_data = UserData(data.get("data", {}))
                    return True
                if show_msgbox: ctypes.windll.user32.MessageBoxW(0, data.get("message", "Error"), "Null-Auth Error", 16)
        except Exception as e:
            if show_msgbox: ctypes.windll.user32.MessageBoxW(0, str(e), "Null-Auth Network Error", 16)
        return False

    def check_hwid(self, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        url = f"{self.server_url}/api/client/auth/hwid"
        payload = {"appId": self.app_id, "appSecret": self.secret, "hwid": hwid, "version": self.version}
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                data = json.loads(res.read().decode('utf-8'))
                if data.get("success"):
                    self.user_data = UserData(data.get("data", {}))
                    return True
                if show_msgbox: ctypes.windll.user32.MessageBoxW(0, data.get("message", "Error"), "Null-Auth Error", 16)
        except Exception as e:
            if show_msgbox: ctypes.windll.user32.MessageBoxW(0, str(e), "Null-Auth Network Error", 16)
        return False

    def user_login(self, username: str, password: str, show_msgbox: bool = True) -> bool:
        hwid = self.get_hwid()
        url = f"{self.server_url}/api/v1/client/user/authenticate"
        payload = {"appId": self.app_id, "appSecret": self.secret, "username": username.strip(), "password": password.strip(), "hwid": hwid, "version": self.version}
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                data = json.loads(res.read().decode('utf-8'))
                if data.get("success"):
                    self.user_data = UserData(data.get("data", {}))
                    return True
                if show_msgbox: ctypes.windll.user32.MessageBoxW(0, data.get("message", "Error"), "Null-Auth Error", 16)
        except Exception as e:
            if show_msgbox: ctypes.windll.user32.MessageBoxW(0, str(e), "Null-Auth Network Error", 16)
        return False

if __name__ == "__main__":
    auth = NullAuth("13026130", "YOUR_RAW_SECRET", "1.0.0")
    key = input("Enter License Key: ").strip()
    if auth.license(key):
        print(f"Access Granted to {auth.user_data.client_name}!")
        print(f"Days Left: {auth.user_data.remaining_days}")
    else:
        print("ACCESS DENIED!")`;

const HWID_POWERSHELL_CLIPBOARD = `$g = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid; $v = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber; $id = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($g + ':' + $v))).Replace('-','').ToLower(); Set-Clipboard $id; Write-Host "HWID (Copied to Clipboard): $id" -ForegroundColor Green`;

const HWID_POWERSHELL_STANDARD = `$g = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid; $v = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").VolumeSerialNumber; [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($g + ':' + $v))).Replace('-','').ToLower()`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'webhook' | 'sdk' | 'api' | 'security' | 'hwid'>('webhook');
  const [sdkLang, setSdkLang] = useState<'csharp' | 'cpp' | 'python'>('csharp');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSdk, setCopiedSdk] = useState<string | null>(null);
  const [copiedHwidCmd, setCopiedHwidCmd] = useState<string | null>(null);

  // Discord Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [maskedWebhookUrl, setMaskedWebhookUrl] = useState('');
  const [botName, setBotName] = useState('Null-Auth Security Guard');
  const [botAvatarUrl, setBotAvatarUrl] = useState('https://i.imgur.com/8Qp4w9f.png');
  const [hasWebhook, setHasWebhook] = useState(false);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);

  const [notifyAuthSuccess, setNotifyAuthSuccess] = useState(true);
  const [notifyAuthFail, setNotifyAuthFail] = useState(true);
  const [notifyLicenseCreate, setNotifyLicenseCreate] = useState(true);
  const [notifyFreeTrial, setNotifyFreeTrial] = useState(true);
  const [notifyAdminActions, setNotifyAdminActions] = useState(true);

  const [previewEventType, setPreviewEventType] = useState<'AUTH_SUCCESS' | 'AUTH_FAIL' | 'KEY_CREATE' | 'FREE_TRIAL' | 'ADMIN_ACTION'>('AUTH_SUCCESS');

  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    const loadWebhookSettings = async () => {
      try {
        const res = await fetchApi('/admin/settings');
        if (res.success && res.data?.discord) {
          const d = res.data.discord;
          setHasWebhook(d.hasWebhook);
          setMaskedWebhookUrl(d.maskedUrl);
          if (d.botName) setBotName(d.botName);
          if (d.botAvatarUrl) setBotAvatarUrl(d.botAvatarUrl);
          if (d.notifyAuthSuccess !== undefined) setNotifyAuthSuccess(d.notifyAuthSuccess);
          if (d.notifyAuthFail !== undefined) setNotifyAuthFail(d.notifyAuthFail);
          if (d.notifyLicenseCreate !== undefined) setNotifyLicenseCreate(d.notifyLicenseCreate);
          if (d.notifyFreeTrial !== undefined) setNotifyFreeTrial(d.notifyFreeTrial);
          if (d.notifyAdminActions !== undefined) setNotifyAdminActions(d.notifyAdminActions);
        }
      } catch (err) {}
    };
    loadWebhookSettings();
  }, []);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    setWebhookMessage(null);
    try {
      const res = await fetchApi('/admin/settings/webhook', {
        method: 'POST',
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || undefined,
          botName: botName.trim(),
          botAvatarUrl: botAvatarUrl.trim(),
          notifyAuthSuccess,
          notifyAuthFail,
          notifyLicenseCreate,
          notifyFreeTrial,
          notifyAdminActions,
        }),
      });
      if (res.success) {
        setWebhookMessage({ type: 'success', text: 'Discord Webhook Command Center configuration saved successfully!' });
        if (webhookUrl.trim()) {
          setHasWebhook(true);
          setMaskedWebhookUrl(webhookUrl.substring(0, 35) + '••••');
          setWebhookUrl('');
        }
      } else {
        setWebhookMessage({ type: 'error', text: res.message || 'Failed to save webhook settings' });
      }
    } catch (err: any) {
      setWebhookMessage({ type: 'error', text: 'Network error saving webhook' });
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setWebhookMessage(null);
    try {
      const res = await fetchApi('/admin/settings/webhook/test', {
        method: 'POST',
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      if (res.success) {
        setWebhookMessage({ type: 'success', text: '🛰️ Test ping delivered to Discord! Check your channel.' });
      } else {
        setWebhookMessage({ type: 'error', text: res.message || 'Failed to send test ping to Discord' });
      }
    } catch (err: any) {
      setWebhookMessage({ type: 'error', text: 'Error connecting to backend for webhook test' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetchApi('/admin/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setError('An error occurred while updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSdk(label);
    setTimeout(() => setCopiedSdk(null), 2000);
  };

  const downloadSdkFile = (code: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyHwidCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedHwidCmd(key);
    setTimeout(() => setCopiedHwidCmd(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <Header
        title="Settings & Client SDK Integration"
        subtitle="Manage administrator security, view live API endpoints, generate machine HWID with PowerShell, and download single-file client SDKs for C#, C++, and Python."
      />

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm flex-wrap">
        <button
          onClick={() => setActiveTab('hwid')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-bold transition-all ${
            activeTab === 'hwid'
              ? 'btn-red-gradient text-white border border-red-500/40 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" /> Machine HWID Tool
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-bold transition-all ${
            activeTab === 'webhook'
              ? 'btn-red-gradient text-white border border-red-500/40 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Bell className="w-4 h-4 text-indigo-400" /> Discord Webhook
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-bold transition-all ${
            activeTab === 'sdk'
              ? 'btn-red-gradient text-white border border-red-500/40 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Code className="w-4 h-4" /> Official Client SDKs
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-bold transition-all ${
            activeTab === 'api'
              ? 'btn-red-gradient text-white border border-red-500/40 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Server className="w-4 h-4" /> Live Endpoints
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] font-bold transition-all ${
            activeTab === 'security'
              ? 'btn-red-gradient text-white border border-red-500/40 shadow-md'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          }`}
        >
          <Lock className="w-4 h-4" /> Admin Security
        </button>
      </div>

      {/* Machine HWID Tool Tab */}
      {activeTab === 'hwid' && (
        <div className="space-y-6 animate-slide-up">
          {/* Main Command Card */}
          <Card className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-[10px] bg-emerald-950/60 border border-emerald-700/50">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Machine Hardware ID (HWID) Tool
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Generate, inspect, and copy your Windows PC's exact Hardware ID matching Null-Auth client SDKs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  POWERSHELL COMPATIBLE
                </span>
                <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono font-bold">
                  SHA-256 HASH
                </span>
              </div>
            </div>

            {/* Quick Explanation Banner */}
            <div className="p-4 rounded-[12px] bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Exact Algorithm Match:</strong> Calculates the SHA-256 hash of <code className="bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-300 font-mono">MachineGuid:VolumeSerialNumber</code> — identical to the C#, C++, and Python SDKs.
                </span>
              </div>
              <span className="text-[11px] font-mono bg-emerald-900/40 border border-emerald-700/40 px-2 py-1 rounded text-emerald-300 shrink-0">
                64 Hex Characters
              </span>
            </div>

            {/* Recommended: PowerShell One-Liner (Auto-Copies to Clipboard) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Recommended: Auto-Copy PowerShell Command
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                    AUTO-CLIPBOARD
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => copyHwidCommand(HWID_POWERSHELL_CLIPBOARD, 'clipboard')}
                  className="text-xs font-bold gap-1.5 py-1.5 px-3 h-auto border-emerald-700/60 hover:border-emerald-500 text-emerald-300 hover:bg-emerald-950/40"
                >
                  {copiedHwidCmd === 'clipboard' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Command!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-400" /> Copy Command
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-[10px] p-4 font-mono text-xs text-zinc-300 relative group overflow-x-auto shadow-inner">
                <pre className="text-emerald-400 whitespace-pre-wrap break-all select-all font-mono leading-relaxed">
                  {HWID_POWERSHELL_CLIPBOARD}
                </pre>
              </div>
              <p className="text-[11px] text-zinc-400">
                ⚡ When executed in PowerShell, this command calculates your HWID, prints it to the console in green, and automatically saves it to your Windows clipboard.
              </p>
            </div>

            {/* Standard Output Command (Print Only) */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Alternative: Standard Output (Print Only)
                </span>
                <Button
                  variant="secondary"
                  onClick={() => copyHwidCommand(HWID_POWERSHELL_STANDARD, 'standard')}
                  className="text-xs font-bold gap-1.5 py-1 px-2.5 h-auto border-zinc-700 hover:border-zinc-500 text-zinc-300"
                >
                  {copiedHwidCmd === 'standard' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-[10px] p-3.5 font-mono text-xs text-zinc-300 relative group overflow-x-auto">
                <pre className="text-zinc-300 whitespace-pre-wrap break-all select-all font-mono leading-relaxed">
                  {HWID_POWERSHELL_STANDARD}
                </pre>
              </div>
              <p className="text-[11px] text-zinc-500">
                Prints only the raw 64-character lowercase hexadecimal hash to standard output without touching clipboard.
              </p>
            </div>

            {/* Step-by-Step Guide */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" /> How to use this HWID:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-[10px] bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-[11px]">1</span>
                    Copy Command
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Click the <strong>Copy Command</strong> button above to copy the PowerShell one-liner.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-[11px]">2</span>
                    Open PowerShell
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Press <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">Win + R</code>, type <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">powershell</code>, and press Enter.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-[11px]">3</span>
                    Paste & Press Enter
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Right-click or press <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">Ctrl + V</code> to paste into PowerShell. Press Enter to run.
                  </p>
                </div>

                <div className="p-3.5 rounded-[10px] bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-[11px]">4</span>
                    Paste in Null-Auth
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Your HWID is now copied! Paste it directly into the <strong>Licenses</strong> or <strong>Users</strong> page to bind the device.
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptographic Architecture Card */}
            <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Hardware Signature Breakdown
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Zero Dependencies Required</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-[8px] bg-zinc-900/50 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-400 font-bold block text-[11px]">1. Cryptography MachineGuid</span>
                  <p className="text-zinc-300 text-[11px]">
                    Read from Windows registry: <br />
                    <code className="text-emerald-300 text-[10px] font-mono break-all">HKLM:\SOFTWARE\Microsoft\Cryptography</code>
                  </p>
                </div>

                <div className="p-3 rounded-[8px] bg-zinc-900/50 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-400 font-bold block text-[11px]">2. System Volume Serial</span>
                  <p className="text-zinc-300 text-[11px]">
                    Root drive serial number: <br />
                    <code className="text-emerald-300 text-[10px] font-mono break-all">Win32_LogicalDisk (DeviceID='C:')</code>
                  </p>
                </div>

                <div className="p-3 rounded-[8px] bg-zinc-900/50 border border-zinc-800/60 space-y-1">
                  <span className="text-zinc-400 font-bold block text-[11px]">3. SHA-256 Digest</span>
                  <p className="text-zinc-300 text-[11px]">
                    Standard cryptographic hash: <br />
                    <code className="text-emerald-300 text-[10px] font-mono break-all">SHA256(Guid + ':' + Serial)</code>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Discord Webhook Tab */}
      {activeTab === 'webhook' && (
        <div className="space-y-6 animate-slide-up">
          <Card className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-[10px] bg-indigo-950/60 border border-indigo-700/50">
                    <Bell className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Discord Webhook Notifications
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Stream real-time security alerts, authentication events, and license provisioning to your Discord server.
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {hasWebhook ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    CONNECTED & ACTIVE
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    NOT CONFIGURED
                  </span>
                )}
              </div>
            </div>

            {/* Notification Feedback Banner */}
            {webhookMessage && (
              <div
                className={`p-3.5 rounded-[10px] border text-xs font-medium flex items-center justify-between gap-3 ${
                  webhookMessage.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                    : 'bg-red-950/50 border-red-800/80 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {webhookMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{webhookMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWebhookMessage(null)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleSaveWebhook} className="space-y-6">
              {/* Bot Identity & Webhook URL Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Discord Bot Username
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="Null-Auth Security Guard"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Discord Bot Avatar URL
                  </label>
                  <input
                    type="text"
                    value={botAvatarUrl}
                    onChange={(e) => setBotAvatarUrl(e.target.value)}
                    placeholder="https://i.imgur.com/8Qp4w9f.png"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Discord Webhook URL
                </label>
                {maskedWebhookUrl && (
                  <div className="p-2.5 rounded-[8px] bg-zinc-950 border border-zinc-800/80 font-mono text-xs text-zinc-400 flex items-center justify-between">
                    <span className="truncate">{maskedWebhookUrl}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Stored In System</span>
                  </div>
                )}
                <div className="relative">
                  <input
                    type={showWebhookUrl ? 'text' : 'password'}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/123456789/abcdef..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showWebhookUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="block text-[11px] text-zinc-500">
                  In Discord: Server Settings &gt; Integrations &gt; Webhooks &gt; New Webhook &gt; Copy Webhook URL.
                </span>
              </div>

              {/* Granular Event Subscriptions Grid */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Granular Event Subscriptions
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Card 1: Key & User Provisioning */}
                  <div
                    onClick={() => setNotifyLicenseCreate(!notifyLicenseCreate)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      notifyLicenseCreate
                        ? 'bg-indigo-950/30 border-indigo-600/50 ring-1 ring-indigo-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">🔑 Key & User Creation</span>
                        <input
                          type="checkbox"
                          checked={notifyLicenseCreate}
                          onChange={() => {}}
                          className="accent-indigo-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Dispatches when new license keys, HWIDs, or user accounts are created.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Security Violations */}
                  <div
                    onClick={() => setNotifyAuthFail(!notifyAuthFail)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      notifyAuthFail
                        ? 'bg-red-950/30 border-red-600/50 ring-1 ring-red-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">🚨 Security Alerts</span>
                        <input
                          type="checkbox"
                          checked={notifyAuthFail}
                          onChange={() => {}}
                          className="accent-red-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Immediate alerts on HWID mismatch, version mismatch, or banned attempts with reported HWID.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Auth Success Logins */}
                  <div
                    onClick={() => setNotifyAuthSuccess(!notifyAuthSuccess)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      notifyAuthSuccess
                        ? 'bg-emerald-950/30 border-emerald-600/50 ring-1 ring-emerald-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">🟢 Auth Success</span>
                        <input
                          type="checkbox"
                          checked={notifyAuthSuccess}
                          onChange={() => {}}
                          className="accent-emerald-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Notifications for authorized client logins with Client Name, HWID, and IP.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Free Trial Logins */}
                  <div
                    onClick={() => setNotifyFreeTrial(!notifyFreeTrial)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      notifyFreeTrial
                        ? 'bg-cyan-950/30 border-cyan-600/50 ring-1 ring-cyan-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">🎁 Free Trial Logins</span>
                        <input
                          type="checkbox"
                          checked={notifyFreeTrial}
                          onChange={() => {}}
                          className="accent-cyan-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Notifications whenever users log in using Free Trial mode with HWID verification.
                      </p>
                    </div>
                  </div>

                  {/* Card 5: Admin Operations */}
                  <div
                    onClick={() => setNotifyAdminActions(!notifyAdminActions)}
                    className={`p-3.5 rounded-[10px] border cursor-pointer select-none transition-all flex flex-col justify-between ${
                      notifyAdminActions
                        ? 'bg-amber-950/30 border-amber-600/50 ring-1 ring-amber-500/20'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">⚙️ Admin Operations</span>
                        <input
                          type="checkbox"
                          checked={notifyAdminActions}
                          onChange={() => {}}
                          className="accent-amber-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Notifications for pause, ban, duration extensions, reset HWID, and deletions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Discord Embed Simulator */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Live Discord Embed Simulator
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px] font-mono font-bold">
                    {(['AUTH_SUCCESS', 'AUTH_FAIL', 'KEY_CREATE', 'FREE_TRIAL', 'ADMIN_ACTION'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPreviewEventType(type)}
                        className={`px-2 py-0.5 rounded transition-all ${
                          previewEventType === type
                            ? 'bg-indigo-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {type === 'AUTH_SUCCESS' ? 'Success' : type === 'AUTH_FAIL' ? 'Security Alert' : type === 'KEY_CREATE' ? 'Provision' : type === 'FREE_TRIAL' ? 'Trial' : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Discord Message UI */}
                <div className="p-4 rounded-[12px] bg-[#313338] text-white font-sans text-xs space-y-2 border border-zinc-800 shadow-xl">
                  <div className="flex items-start gap-3">
                    <img
                      src={botAvatarUrl || 'https://i.imgur.com/8Qp4w9f.png'}
                      alt="Bot Avatar"
                      className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                      onError={(e) => { (e.target as any).src = 'https://i.imgur.com/8Qp4w9f.png'; }}
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{botName || 'Null-Auth Security Guard'}</span>
                        <span className="px-1.5 py-0.5 bg-[#5865F2] text-white text-[9px] font-bold rounded">BOT</span>
                        <span className="text-[10px] text-zinc-400">Today at 9:30 PM</span>
                      </div>

                      {/* Embed Box */}
                      <div className={`mt-1.5 p-3.5 rounded-[4px] bg-[#2b2d31] border-l-4 space-y-2 ${
                        previewEventType === 'AUTH_SUCCESS' ? 'border-[#10b981]' :
                        previewEventType === 'AUTH_FAIL' ? 'border-[#ef4444]' :
                        previewEventType === 'KEY_CREATE' ? 'border-[#3b82f6]' :
                        previewEventType === 'FREE_TRIAL' ? 'border-[#06b6d4]' : 'border-[#f59e0b]'
                      }`}>
                        <h4 className="font-bold text-white text-sm">
                          {previewEventType === 'AUTH_SUCCESS' && '🟢 Client Authentication Success'}
                          {previewEventType === 'AUTH_FAIL' && '🚨 Null-Auth Security Gate Alert'}
                          {previewEventType === 'KEY_CREATE' && '🔑 New License Key Created'}
                          {previewEventType === 'FREE_TRIAL' && '🎁 Free Trial Authentication'}
                          {previewEventType === 'ADMIN_ACTION' && '⚙️ Administrative Security Action'}
                        </h4>
                        <p className="text-zinc-300 text-xs">
                          {previewEventType === 'AUTH_SUCCESS' && 'Client successfully authenticated into Pro Cheat Loader.'}
                          {previewEventType === 'AUTH_FAIL' && 'An unauthorized authentication attempt (HWID Mismatch) was blocked by the security gate.'}
                          {previewEventType === 'KEY_CREATE' && 'A new client license key has been provisioned and is ready for activation.'}
                          {previewEventType === 'FREE_TRIAL' && 'A client authenticated using Free Trial Access on Pro Cheat Loader.'}
                          {previewEventType === 'ADMIN_ACTION' && 'An administrative action (LICENSE_STATUS_PAUSED) was executed.'}
                        </p>

                        {previewEventType === 'AUTH_SUCCESS' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Application</span>
                                <span className="text-white font-medium">Pro Cheat Loader</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Client Identity</span>
                                <span className="text-white font-medium">AlphaTester (Alex)</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">App Version</span>
                                <code className="text-zinc-200 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">v1.0.4</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Key / Identifier</span>
                                <code className="text-purple-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">KEY-9A82-F012-BC44</code>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Hardware ID (HWID)</span>
                              <div className="bg-[#1e1f22] p-2 rounded border border-zinc-700/40">
                                <code className="text-purple-300 font-mono text-[11px] block break-all select-all leading-relaxed">
                                  43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b
                                </code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Origin IP</span>
                                <code className="text-emerald-400 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">192.168.1.100</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Timestamp</span>
                                <span className="text-zinc-300 text-[11px]">Just now</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {previewEventType === 'AUTH_FAIL' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Application</span>
                                <span className="text-white font-medium">Pro Cheat Loader</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Security Violation</span>
                                <span className="text-red-400 font-bold">🚨 HWID Mismatch</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Client Name</span>
                                <span className="text-white font-medium">AlphaTester (Alex)</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Attempted Key / User</span>
                                <code className="text-zinc-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">KEY-9A82-F012-BC44</code>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Reported Hardware ID (HWID)</span>
                              <div className="bg-[#1e1f22] p-2 rounded border border-red-900/40">
                                <code className="text-red-300 font-mono text-[11px] block break-all select-all leading-relaxed">
                                  43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b
                                </code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Origin IP</span>
                                <code className="text-red-400 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">192.168.1.100</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Blocked At</span>
                                <span className="text-zinc-300 text-[11px]">Just now</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {previewEventType === 'KEY_CREATE' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Application</span>
                                <span className="text-white font-medium">Pro Cheat Loader</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Duration</span>
                                <code className="text-blue-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">30 Days</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Client Name</span>
                                <span className="text-white font-medium">John Doe</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Provisioned License Key / User Account Credentials</span>
                              <div className="space-y-1.5">
                                <div className="bg-[#1e1f22] p-2 rounded border border-blue-900/40 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[11px]">License:</span>
                                  <code className="text-blue-300 font-mono text-[11px] select-all">
                                    KEY-77AB-8910-FEDC-2026
                                  </code>
                                </div>
                                <div className="bg-[#1e1f22] p-2 rounded border border-blue-900/40 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[11px]">Username:</span>
                                  <code className="text-cyan-300 font-mono text-[11px] select-all">
                                    john_doe_99
                                  </code>
                                </div>
                                <div className="bg-[#1e1f22] p-2 rounded border border-blue-900/40 flex items-center justify-between">
                                  <span className="text-zinc-400 text-[11px]">Password:</span>
                                  <code className="text-amber-300 font-mono text-[11px] select-all">
                                    P@ssw0rd2026!
                                  </code>
                                </div>
                                <div className="bg-[#1e1f22] p-2 rounded border border-cyan-900/40">
                                  <span className="text-cyan-400 font-bold block text-[10px] mb-0.5">Credentials (user:pass):</span>
                                  <code className="text-cyan-300 font-mono text-[11px] block break-all select-all">
                                    john_doe_99:P@ssw0rd2026!
                                  </code>
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Authorized Hardware ID (HWID)</span>
                              <div className="bg-[#1e1f22] p-2 rounded border border-purple-900/40">
                                <code className="text-purple-300 font-mono text-[11px] block break-all select-all leading-relaxed">
                                  43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b
                                </code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Triggered By Admin IP</span>
                                <code className="text-zinc-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">127.0.0.1</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Timestamp</span>
                                <span className="text-zinc-300 text-[11px]">Just now</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {previewEventType === 'FREE_TRIAL' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Application</span>
                                <span className="text-white font-medium">Pro Cheat Loader</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Client Identity</span>
                                <span className="text-white font-medium">Free Trial Device</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">App Version</span>
                                <code className="text-cyan-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">v1.0.4</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Key / Identifier</span>
                                <code className="text-cyan-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">FREE_TRIAL_GLOBAL</code>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Hardware ID (HWID)</span>
                              <div className="bg-[#1e1f22] p-2 rounded border border-cyan-900/40">
                                <code className="text-cyan-300 font-mono text-[11px] block break-all select-all leading-relaxed">
                                  43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b
                                </code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Origin IP</span>
                                <code className="text-emerald-400 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">192.168.1.100</code>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Timestamp</span>
                                <span className="text-zinc-300 text-[11px]">Just now</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {previewEventType === 'ADMIN_ACTION' && (
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Application</span>
                                <span className="text-white font-medium">Pro Cheat Loader</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Action</span>
                                <code className="text-amber-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">LICENSE_RESET_HWID</code>
                              </div>
                              <div className="col-span-2">
                                <span className="text-zinc-400 font-bold block text-[11px]">Target Record</span>
                                <code className="text-zinc-200 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">KEY-9A82-F012-BC44</code>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-400 font-bold block text-[11px] mb-1">Hardware ID (HWID)</span>
                              <div className="bg-[#1e1f22] p-2 rounded border border-amber-900/40">
                                <code className="text-amber-300 font-mono text-[11px] block break-all select-all leading-relaxed">
                                  43f3ef9ce386ba5ca3a97714c92346a2a4da153e0c1fbbc23e4d75234cdaff4b
                                </code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Details</span>
                                <span className="text-zinc-300 text-[11px]">Bound HWID unlinked / cleared</span>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-bold block text-[11px]">Admin IP</span>
                                <code className="text-zinc-300 bg-[#1e1f22] px-1.5 py-0.5 rounded text-[11px]">127.0.0.1</code>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-700/60 flex items-center justify-between text-[10px] text-zinc-400">
                          <span>Null-Auth Platform • Cloud Security Gate</span>
                          <span>Just now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestWebhook}
                  isLoading={isTestingWebhook}
                  className="gap-2 text-xs font-bold border-zinc-700 hover:border-indigo-500/50 text-indigo-300"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  Send Test Ping to Discord
                </Button>

                <Button
                  type="submit"
                  isLoading={isSavingWebhook}
                  className="gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md shadow-indigo-900/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Save Webhook Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* SDK Integration Tab */}
      {activeTab === 'sdk' && (
        <div className="space-y-6 animate-slide-up">
          {/* Quick HWID Generator Callout */}
          <div className="p-3.5 rounded-[10px] bg-gradient-to-r from-zinc-950 via-zinc-950 to-emerald-950/30 border border-emerald-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300">
                Need your Windows PC's exact <strong>Hardware ID (HWID)</strong> for testing client authentication?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => copyHwidCommand(HWID_POWERSHELL_CLIPBOARD, 'sdk_banner')}
                className="text-xs font-bold gap-1.5 py-1 px-2.5 h-auto border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40"
              >
                {copiedHwidCmd === 'sdk_banner' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied Command!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-emerald-400" /> Copy PowerShell One-Liner
                  </>
                )}
              </Button>
              <button
                onClick={() => setActiveTab('hwid')}
                className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
              >
                View HWID Tool &rarr;
              </button>
            </div>
          </div>

          <Card className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-red-400" /> Single-File Client SDKs
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                    PRODUCTION-READY
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Plug-and-play single-file SDKs with dynamic Native Win32 popup error messages & real Hardware ID (HWID) detection.
                </p>
              </div>

              {/* Language Switcher Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-[10px] text-xs font-bold">
                <button
                  onClick={() => setSdkLang('csharp')}
                  className={`px-3 py-1.5 rounded-[8px] transition-all flex items-center gap-1.5 ${
                    sdkLang === 'csharp'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" /> C# (.NET / AOT)
                </button>
                <button
                  onClick={() => setSdkLang('cpp')}
                  className={`px-3 py-1.5 rounded-[8px] transition-all flex items-center gap-1.5 ${
                    sdkLang === 'cpp'
                      ? 'bg-red-950 text-red-400 border border-red-800/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" /> C++ (Win32)
                </button>
                <button
                  onClick={() => setSdkLang('python')}
                  className={`px-3 py-1.5 rounded-[8px] transition-all flex items-center gap-1.5 ${
                    sdkLang === 'python'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/50 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" /> Python 3
                </button>
              </div>
            </div>

            {/* Selected SDK Content Panel */}
            {sdkLang === 'csharp' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> NullAuth.cs — NativeAOT Reflection-Safe C# SDK
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyCode(CSHARP_SDK, 'csharp')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      {copiedSdk === 'csharp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy C# SDK
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadSdkFile(CSHARP_SDK, 'NullAuth.cs')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download NullAuth.cs
                    </Button>
                  </div>
                </div>
                <pre className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[420px] custom-scrollbar">
                  {CSHARP_SDK}
                </pre>
              </div>
            )}

            {sdkLang === 'cpp' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> NullAuth.cpp — Modern Win32 C++ Client SDK
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyCode(CPP_SDK, 'cpp')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      {copiedSdk === 'cpp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy C++ SDK
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadSdkFile(CPP_SDK, 'NullAuth.cpp')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download NullAuth.cpp
                    </Button>
                  </div>
                </div>
                <pre className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[420px] custom-scrollbar">
                  {CPP_SDK}
                </pre>
              </div>
            )}

            {sdkLang === 'python' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> NullAuth.py — Bulletproof Single-File Python SDK
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyCode(PYTHON_SDK, 'python')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      {copiedSdk === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Python SDK
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadSdkFile(PYTHON_SDK, 'NullAuth.py')}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download NullAuth.py
                    </Button>
                  </div>
                </div>
                <pre className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[420px] custom-scrollbar">
                  {PYTHON_SDK}
                </pre>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* API Endpoints Tab */}
      {activeTab === 'api' && (
        <Card className="space-y-5 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-[10px] bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">Live Production API Endpoints</h2>
              <p className="text-xs text-zinc-400">
                HTTPS endpoints hosted on Vercel Serverless & Supabase PostgreSQL Cloud.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs">
            <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  License Authentication Endpoint (Method 1)
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">POST</span>
              </div>
              <p className="font-mono text-red-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-[8px] border border-zinc-800 select-all">
                https://nullauthbackend.vercel.app/api/v1/client/license/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, licenseKey, hwid, version }"}</code>
              </p>
            </div>

            <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  HWID Whitelist Authentication Endpoint (Method 2)
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">POST</span>
              </div>
              <p className="font-mono text-purple-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-[8px] border border-zinc-800 select-all">
                https://nullauthbackend.vercel.app/api/v1/client/hwid/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, hwid, version }"}</code>
              </p>
            </div>

            <div className="p-4 rounded-[12px] bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                  User Account Authentication Endpoint (Method 3)
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">POST</span>
              </div>
              <p className="font-mono text-cyan-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-[8px] border border-zinc-800 select-all">
                https://nullauthbackend.vercel.app/api/v1/client/user/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, username, password, hwid, version }"}</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card className="space-y-5 animate-slide-up">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-[10px] bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">Change Admin Password</h2>
              <p className="text-xs text-zinc-400">
                Update your administrator credentials for accessing the Null-Auth dashboard.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-[10px] bg-red-950/60 border border-red-800/50 flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-[10px] bg-emerald-950/60 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <Button type="submit" isLoading={isLoading} className="mt-2 shadow-lg shadow-red-950/40">
              Update Password
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
