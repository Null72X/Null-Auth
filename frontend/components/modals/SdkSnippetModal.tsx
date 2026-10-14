'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, Code, FileCode2, ShieldAlert, Cpu } from 'lucide-react';

interface SdkSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
}

type LangTab = 'csharp' | 'cpp' | 'python';

export function SdkSnippetModal({ isOpen, onClose, app }: SdkSnippetModalProps) {
  const [activeTab, setActiveTab] = useState<LangTab>('csharp');
  const [copied, setCopied] = useState(false);

  if (!app) return null;

  const appMode = app.type || 'LICENSE';
  const isLicenseMode = appMode === 'LICENSE';
  const isUserAuthMode = appMode === 'USER_AUTH';
  const isHwidMode = appMode === 'HWID';

  const appId = (app.appId || app.id || 'YOUR_APP_ID').replace(/^NA-/, '');
  const appSecret = (app.secret || 'YOUR_APP_SECRET').replace(/^nas_/, '');
  
  const apiBase = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const csharpSnippet = `using System;
using System.Diagnostics;
using System.Net.Http;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using NullAuthClient;

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
        public string SessionToken { get; set; } = "";
    }

    public class NullAuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string ErrorCode { get; set; }
        public string DownloadUrl { get; set; }
        public UserData Data { get; set; }
    }

    public class NullAuth
    {
        public string AppId { get; }
        public string Secret { get; }
        public string Version { get; }
        public string ServerUrl { get; }
        public UserData UserData { get; private set; } = new UserData();
        public bool Initialized { get; private set; } = false;

        private static readonly HttpClient _http = new HttpClient();
        private System.Threading.Timer _heartbeatTimer;

        public NullAuth(string appId, string secret, string version = "1.0.0", string serverUrl = "https://nullauthbackend.vercel.app")
        {
            AppId = appId?.Trim() ?? "";
            Secret = secret?.Trim() ?? "";
            Version = version?.Trim() ?? "1.0.0";
            ServerUrl = serverUrl?.TrimEnd('/') ?? "https://nullauthbackend.vercel.app";
        }

        [System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        private static extern bool IsDebuggerPresent();

        [System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, ref bool isDebuggerPresent);

        public static void CheckAntiDebug()
        {
            if (Debugger.IsAttached || IsDebuggerPresent())
            {
                ShowPopup("Security Violation", "Active debugger detected! Execution terminated for safety.", MessageBoxIcon.Stop);
                Environment.Exit(0xDEB);
            }

            bool isRemoteDebugger = false;
            try
            {
                CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref isRemoteDebugger);
                if (isRemoteDebugger)
                {
                    ShowPopup("Security Violation", "Remote debugger detected! Execution terminated for safety.", MessageBoxIcon.Stop);
                    Environment.Exit(0xDEB);
                }
            }
            catch { }
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
                    using var subKey = key.OpenSubKey(@"SOFTWARE\\\\Microsoft\\\\Cryptography");
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

                using var sha256 = SHA256.Create();
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
            else if (errCode == "LICENSE_EXPIRED" || errCode == "IDENTIFIER_EXPIRED" || errCode == "USER_EXPIRED" || errCode == "TRIAL_EXPIRED") title = "License Expired";
            else if (errCode == "LICENSE_BANNED" || errCode == "IDENTIFIER_BANNED" || errCode == "USER_BANNED") title = "Account Banned";
            else if (errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED" || errCode == "USER_PAUSED") title = "Access Paused";
            else if (errCode == "HWID_MISMATCH") title = "HWID Mismatch";
            else if (errCode == "LICENSE_NOT_FOUND" || errCode == "IDENTIFIER_NOT_FOUND" || errCode == "USER_NOT_FOUND") title = "Invalid Key / HWID";
            else if (errCode == "APPLICATION_DISABLED") title = "Application Paused";
            else if (errCode == "TAMPERING_DETECTED") title = "Security Violation: Tampered Response";

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

        public static string ComputeHmacSha256(string key, string message)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
            var sb = new StringBuilder(hash.Length * 2);
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private bool VerifyResponseSignature(string identifier, string status, string expiresAt, long timestamp, string nonce, string signature)
        {
            if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(nonce) || timestamp == 0) return false;
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (Math.Abs(now - timestamp) > 300) return false;

            string normAppId = AppId.Replace("NA-", "").Trim();
            string normSecret = Secret.Replace("nas_", "").Trim();
            string payload = $"{normAppId}:{identifier}:{timestamp}:{nonce}:{status}:{expiresAt}";
            string expectedSig = ComputeHmacSha256(normSecret, payload);
            return string.Equals(expectedSig, signature, StringComparison.OrdinalIgnoreCase);
        }

        private void StartHeartbeat(string sessionToken)
        {
            _heartbeatTimer?.Dispose();
            _heartbeatTimer = new System.Threading.Timer(async _ =>
            {
                try
                {
                    CheckAntiDebug();
                    string hwid = GetHwid();
                    string body = "{\\"appId\\":\\"" + EscapeJson(AppId) + "\\",\\"appSecret\\":\\"" + EscapeJson(Secret) + "\\",\\"sessionToken\\":\\"" + EscapeJson(sessionToken) + "\\",\\"hwid\\":\\"" + EscapeJson(hwid) + "\\"}";
                    var content = new StringContent(body, Encoding.UTF8, "application/json");
                    var response = await _http.PostAsync($"{ServerUrl}/api/v1/client/auth/heartbeat", content);
                    string resStr = await response.Content.ReadAsStringAsync();

                    using var doc = JsonDocument.Parse(resStr);
                    var root = doc.RootElement;
                    bool kill = root.TryGetProperty("kill", out var k) && k.GetBoolean();
                    if (!response.IsSuccessStatusCode || kill)
                    {
                        ShowPopup("Access Terminated", "Session revoked, paused, or expired by administrator. Terminating process.", MessageBoxIcon.Warning);
                        Environment.Exit(0xDEAD);
                    }
                }
                catch { }
            }, null, TimeSpan.FromSeconds(45), TimeSpan.FromSeconds(45));
        }

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";
            string cleanKey = key?.Trim() ?? "";

            string jsonBody = "{\\"appId\\":\\"" + EscapeJson(AppId) + "\\",\\"appSecret\\":\\"" + EscapeJson(Secret) + "\\",\\"licenseKey\\":\\"" + EscapeJson(cleanKey) + "\\",\\"hwid\\":\\"" + EscapeJson(hwid) + "\\",\\"version\\":\\"" + EscapeJson(Version) + "\\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(cleanKey, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> CheckHwidAsync(bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/hwid/authenticate";

            string jsonBody = "{\\"appId\\":\\"" + EscapeJson(AppId) + "\\",\\"appSecret\\":\\"" + EscapeJson(Secret) + "\\",\\"hwid\\":\\"" + EscapeJson(hwid) + "\\",\\"version\\":\\"" + EscapeJson(Version) + "\\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(hwid, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> UserLoginAsync(string username, string password, bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/user/authenticate";
            string cleanUser = username?.Trim() ?? "";

            string jsonBody = "{\\"appId\\":\\"" + EscapeJson(AppId) + "\\",\\"appSecret\\":\\"" + EscapeJson(Secret) + "\\",\\"username\\":\\"" + EscapeJson(cleanUser) + "\\",\\"password\\":\\"" + EscapeJson(password?.Trim()) + "\\",\\"hwid\\":\\"" + EscapeJson(hwid) + "\\",\\"version\\":\\"" + EscapeJson(Version) + "\\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(cleanUser, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public class RawResponse : NullAuthResult
        {
            public long RawTimestamp { get; set; }
            public string RawNonce { get; set; }
            public string RawSignature { get; set; }
        }

        private async Task<RawResponse> SendRequestAsync(string endpoint, string jsonBody)
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
                long timestamp = 0;
                string nonce = null;
                string signature = null;

                if (root.TryGetProperty("data", out var d))
                {
                    if (d.ValueKind == JsonValueKind.Object)
                    {
                        if (d.TryGetProperty("downloadUrl", out var dl)) downloadUrl = dl.GetString();
                        if (d.TryGetProperty("timestamp", out var ts)) timestamp = ts.GetInt64();
                        if (d.TryGetProperty("nonce", out var n)) nonce = n.GetString();
                        if (d.TryGetProperty("signature", out var sig)) signature = sig.GetString();

                        data = new UserData
                        {
                            Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active",
                            ClientName = d.TryGetProperty("client_name", out var cn) ? cn.GetString() : "",
                            Expires = d.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                            RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                            Ip = d.TryGetProperty("ip", out var ip) ? ip.GetString() : "",
                            SessionToken = d.TryGetProperty("session_token", out var st) ? st.GetString() : "",
                        };
                    }
                }

                return new RawResponse
                {
                    Success = success,
                    Message = message,
                    ErrorCode = errorCode,
                    DownloadUrl = downloadUrl,
                    Data = data,
                    RawTimestamp = timestamp,
                    RawNonce = nonce,
                    RawSignature = signature
                };
            }
            catch (Exception ex)
            {
                return new RawResponse { Success = false, Message = ex.Message, ErrorCode = "NETWORK_ERROR" };
            }
        }
    }
}

class Program
{
    static async Task Main()
    {
        Console.Title = "${app.name} - Null-Auth Protected";
        Console.WriteLine("=================================================");
        Console.WriteLine("        🛡️ ${app.name} Protection Active          ");
        Console.WriteLine("=================================================\\n");

        NullAuth.CheckAntiDebug();

        var auth = new NullAuth(
            appId: "${appId}",
            secret: "${appSecret}",
            version: "${app.version || '1.0.0'}",
            serverUrl: "${apiBase}"
        );

        Console.WriteLine("[*] Authenticating with Null-Auth Guard...");

        Console.WriteLine("Select Authentication Mode:");
        Console.WriteLine("1. License Key Authentication");
        Console.WriteLine("2. User Account Login (Username & Password)");
        Console.WriteLine("3. Hardware ID (HWID) Whitelist Check");
        Console.Write("Select Mode (1-3): ");
        string mode = Console.ReadLine()?.Trim();

        bool success = false;
        if (mode == "1")
        {
            Console.Write("Enter License Key: ");
            string key = Console.ReadLine()?.Trim();
            success = await auth.LicenseAsync(key);
        }
        else if (mode == "2")
        {
            Console.Write("Enter Username: ");
            string user = Console.ReadLine()?.Trim();
            Console.Write("Enter Password: ");
            string pass = Console.ReadLine()?.Trim();
            success = await auth.UserLoginAsync(user, pass);
        }
        else if (mode == "3")
        {
            success = await auth.CheckHwidAsync();
        }
        else
        {
            Console.WriteLine("Invalid mode selection!");
            return;
        }

        if (success)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"\\n[+] Access Granted! Welcome, {auth.UserData.ClientName}");
            Console.WriteLine($"[+] Days Remaining: {auth.UserData.RemainingDays} days");
            Console.WriteLine($"[+] Assigned IP: {auth.UserData.Ip}");
            Console.WriteLine("[+] HMAC-SHA256 Response Signature: VERIFIED");
            Console.WriteLine("[+] Real-Time Heartbeat: RUNNING (45s Remote Kill Active)");
            Console.ResetColor();

            Console.WriteLine("\\n[*] Launching main application logic...");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\\n[-] Authentication Failed!");
            Console.ResetColor();
            Environment.Exit(1);
        }

        Console.WriteLine("\\nPress Enter to exit...");
        Console.ReadLine();
    }
}`;

  const cppSnippet = `#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <wincrypt.h>
#include <array>
#include <cctype>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "advapi32.lib")

bool CheckHardwareBreakpoints() {
    CONTEXT ctx;
    ZeroMemory(&ctx, sizeof(CONTEXT));
    ctx.ContextFlags = CONTEXT_DEBUG_REGISTERS;
    HANDLE hThread = GetCurrentThread();
    if (GetThreadContext(hThread, &ctx)) {
        if (ctx.Dr0 || ctx.Dr1 || ctx.Dr2 || ctx.Dr3) return true;
    }
    return false;
}

void CheckAntiDebug() {
    if (IsDebuggerPresent()) {
        MessageBoxA(0, "Debugger detected! Execution terminated for safety.", "Security Violation", MB_ICONSTOP | MB_OK);
        ExitProcess(0xDEB);
    }
    BOOL isRemote = FALSE;
    CheckRemoteDebuggerPresent(GetCurrentProcess(), &isRemote);
    if (isRemote) {
        MessageBoxA(0, "Remote debugger detected! Execution terminated for safety.", "Security Violation", MB_ICONSTOP | MB_OK);
        ExitProcess(0xDEB);
    }
    if (CheckHardwareBreakpoints()) {
        MessageBoxA(0, "Hardware breakpoint detected! Execution terminated.", "Security Violation", MB_ICONSTOP | MB_OK);
        ExitProcess(0xDEB);
    }
}

bool Sha256Raw(const BYTE* data, DWORD len, BYTE* out32) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    DWORD cbHash = 32;
    bool ok = false;
    if (CryptAcquireContextA(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
            if (CryptHashData(hHash, data, len, 0)) {
                if (CryptGetHashParam(hHash, HP_HASHVAL, out32, &cbHash, 0)) {
                    ok = true;
                }
            }
            CryptDestroyHash(hHash);
        }
        CryptReleaseContext(hProv, 0);
    }
    return ok;
}

std::string Sha256(const std::string& input) {
    BYTE hash[32];
    if (!Sha256Raw((const BYTE*)input.c_str(), (DWORD)input.length(), hash)) return "";
    char hexDigits[] = "0123456789abcdef";
    std::string res = "";
    for (int i = 0; i < 32; i++) {
        res += hexDigits[(hash[i] >> 4) & 0x0F];
        res += hexDigits[hash[i] & 0x0F];
    }
    return res;
}

std::string HmacSha256(const std::string& key, const std::string& data) {
    BYTE k[64] = {0};
    if (key.length() > 64) {
        Sha256Raw((const BYTE*)key.c_str(), (DWORD)key.length(), k);
    } else {
        memcpy(k, key.c_str(), key.length());
    }

    BYTE k_ipad[64];
    BYTE k_opad[64];
    for (int i = 0; i < 64; i++) {
        k_ipad[i] = k[i] ^ 0x36;
        k_opad[i] = k[i] ^ 0x5c;
    }

    std::string innerInput((char*)k_ipad, 64);
    innerInput += data;
    BYTE innerHash[32];
    Sha256Raw((const BYTE*)innerInput.c_str(), (DWORD)innerInput.length(), innerHash);

    std::string outerInput((char*)k_opad, 64);
    outerInput.append((char*)innerHash, 32);
    BYTE outerHash[32];
    Sha256Raw((const BYTE*)outerInput.c_str(), (DWORD)outerInput.length(), outerHash);

    char hexDigits[] = "0123456789abcdef";
    std::string res = "";
    for (int i = 0; i < 32; i++) {
        res += hexDigits[(outerHash[i] >> 4) & 0x0F];
        res += hexDigits[outerHash[i] & 0x0F];
    }
    return res;
}

std::string CleanPrefix(const std::string& str, const std::string& prefix) {
    if (str.rfind(prefix, 0) == 0) return str.substr(prefix.length());
    return str;
}

std::string GetHwid() {
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

std::string ParseJsonField(const std::string& json, const std::string& key) {
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

long long ParseJsonLong(const std::string& json, const std::string& key) {
    std::string search = "\\"" + key + "\\":";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return 0;
    size_t start = pos + search.length();
    while (start < json.length() && (json[start] == ' ' || json[start] == '\\"')) start++;
    size_t end = start;
    while (end < json.length() && (isdigit(static_cast<unsigned char>(json[end])) || json[end] == '-')) end++;
    if (start == end) return 0;
    try { return std::stoll(json.substr(start, end - start)); } catch (...) { return 0; }
}

int ParseJsonInt(const std::string& json, const std::string& key) {
    return static_cast<int>(ParseJsonLong(json, key));
}

struct HeartbeatContext {
    std::string host;
    std::string appId;
    std::string appSecret;
    std::string sessionToken;
    std::string hwid;
};

HeartbeatContext g_hb;

DWORD WINAPI HeartbeatWorker(LPVOID lpParam) {
    while (true) {
        Sleep(45000);
        CheckAntiDebug();

        HINTERNET hInternet = InternetOpenA("NullAuthGuard/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
        if (hInternet) {
            HINTERNET hConnect = InternetConnectA(hInternet, g_hb.host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (hConnect) {
                HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/v1/client/auth/heartbeat", NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0);
                if (hRequest) {
                    std::string hbBody = "{\\"appId\\":\\"" + g_hb.appId + "\\",\\"appSecret\\":\\"" + g_hb.appSecret + "\\",\\"sessionToken\\":\\"" + g_hb.sessionToken + "\\",\\"hwid\\":\\"" + g_hb.hwid + "\\"}";
                    std::string headers = "Content-Type: application/json\\r\\n";
                    if (HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)hbBody.c_str(), (DWORD)hbBody.length())) {
                        char buf[1024];
                        DWORD bytesRead = 0;
                        std::string res = "";
                        while (InternetReadFile(hRequest, buf, sizeof(buf) - 1, &bytesRead) && bytesRead > 0) {
                            buf[bytesRead] = '\\0';
                            res += buf;
                        }
                        if (res.find("\\"kill\\":true") != std::string::npos) {
                            MessageBoxA(0, "Session revoked, paused, or expired by administrator.", "Access Revoked", MB_ICONSTOP | MB_OK);
                            ExitProcess(0xDEAD);
                        }
                    }
                    InternetCloseHandle(hRequest);
                }
                InternetCloseHandle(hConnect);
            }
            InternetCloseHandle(hInternet);
        }
    }
    return 0;
}

bool SendAuthRequest(const std::string& path, const std::string& jsonPayload, const std::string& identifier) {
    CheckAntiDebug();

    const std::string host = "${typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? 'nullauthbackend.vercel.app' : window.location.hostname) : 'nullauthbackend.vercel.app'}";
    const std::string hwid = GetHwid();

    HINTERNET hInternet = InternetOpenA("NullAuthGuard/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
    if (!hInternet) return false;

    HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    if (!hConnect) { InternetCloseHandle(hInternet); return false; }

    DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, flags, 0);
    if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

    std::string headers = "Content-Type: application/json\\r\\n";
    BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), static_cast<DWORD>(headers.length()), (LPVOID)jsonPayload.c_str(), static_cast<DWORD>(jsonPayload.length()));

    std::string response = "";
    if (sent) {
        char buffer[2048];
        DWORD bytesRead = 0;
        while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
            buffer[bytesRead] = '\\0';
            response += buffer;
        }
    }

    InternetCloseHandle(hRequest);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hInternet);

    if (response.find("\\"success\\":true") != std::string::npos) {
        std::string sig = ParseJsonField(response, "signature");
        std::string nonce = ParseJsonField(response, "nonce");
        long long timestamp = ParseJsonLong(response, "timestamp");
        std::string status = ParseJsonField(response, "status");
        if (status.empty()) status = "active";
        std::string expiresAt = ParseJsonField(response, "expires_at");
        std::string sessionToken = ParseJsonField(response, "session_token");

        std::string normAppId = CleanPrefix("${appId}", "NA-");
        std::string normSecret = CleanPrefix("${appSecret}", "nas_");
        std::string payloadToSign = normAppId + ":" + identifier + ":" + std::to_string(timestamp) + ":" + nonce + ":" + status + ":" + expiresAt;
        std::string expectedSig = HmacSha256(normSecret, payloadToSign);

        if (sig.empty() || sig != expectedSig) {
            std::cout << "\\n[-] Cryptographic Signature Verification Failed! Tampering detected.\\n";
            MessageBoxA(0, "HMAC-SHA256 signature verification failed! Response intercepted or modified.", "Security Violation", MB_ICONSTOP | MB_OK);
            ExitProcess(0xBAD);
        }

        std::string clientName = ParseJsonField(response, "client_name");
        int remainingDays = ParseJsonInt(response, "remaining_days");
        std::string ip = ParseJsonField(response, "ip");

        std::cout << "\\n[+] Access Granted! Welcome, " << (clientName.empty() ? "Client" : clientName) << std::endl;
        std::cout << "[+] Days Remaining: " << remainingDays << " days" << std::endl;
        if (!ip.empty()) std::cout << "[+] Assigned IP: " << ip << std::endl;
        std::cout << "[+] HMAC-SHA256 Signature: VERIFIED" << std::endl;
        std::cout << "[+] Real-Time Heartbeat: RUNNING (45s Remote Kill Active)" << std::endl;

        g_hb.host = host;
        g_hb.appId = "${appId}";
        g_hb.appSecret = "${appSecret}";
        g_hb.sessionToken = sessionToken;
        g_hb.hwid = hwid;
        CreateThread(NULL, 0, HeartbeatWorker, NULL, 0, NULL);

        return true;
    }

    std::string errMsg = ParseJsonField(response, "message");
    if (errMsg.empty()) errMsg = "Authentication failed.";
    std::cout << "\\n[-] Access Denied: " << errMsg << std::endl;
    MessageBoxA(0, errMsg.c_str(), "Null-Auth Alert", MB_ICONERROR | MB_OK);
    return false;
}

bool AuthenticateLicense(const std::string& licenseKey) {
    std::string hwid = GetHwid();
    std::string jsonPayload = "{\\"appId\\":\\"${appId}\\",\\"appSecret\\":\\"${appSecret}\\",\\"licenseKey\\":\\"" + licenseKey + "\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"${app.version || '1.0.0'}\\"}";
    return SendAuthRequest("/api/v1/client/auth/license", jsonPayload, licenseKey);
}

bool AuthenticateUser(const std::string& username, const std::string& password) {
    std::string hwid = GetHwid();
    std::string jsonPayload = "{\\"appId\\":\\"${appId}\\",\\"appSecret\\":\\"${appSecret}\\",\\"username\\":\\"" + username + "\\",\\"password\\":\\"" + password + "\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"${app.version || '1.0.0'}\\"}";
    return SendAuthRequest("/api/v1/client/auth/user", jsonPayload, username);
}

bool AuthenticateHwid() {
    std::string hwid = GetHwid();
    std::string jsonPayload = "{\\"appId\\":\\"${appId}\\",\\"appSecret\\":\\"${appSecret}\\",\\"hwid\\":\\"" + hwid + "\\",\\"version\\":\\"${app.version || '1.0.0'}\\"}";
    return SendAuthRequest("/api/v1/client/auth/hwid", jsonPayload, hwid);
}

int main() {
    CheckAntiDebug();
    SetConsoleTitleA("${app.name} - Null-Auth Protected");
    std::cout << "=================================================\\n";
    std::cout << "        🛡️ ${app.name} Protection Active         \\n";
    std::cout << "=================================================\\n\\n";

    std::cout << "Select Authentication Mode:\\n";
    std::cout << "1. License Key Authentication\\n";
    std::cout << "2. User Account Login (Username & Password)\\n";
    std::cout << "3. Hardware ID (HWID) Whitelist Check\\n";
    std::cout << "Select Mode (1-3): ";
    int mode = 1;
    std::cin >> mode;

    bool success = false;
    if (mode == 1) {
        std::cout << "Enter License Key: ";
        std::string key;
        std::cin >> key;
        success = AuthenticateLicense(key);
    } else if (mode == 2) {
        std::cout << "Enter Username: ";
        std::string uStr, pStr;
        std::cin >> uStr;
        std::cout << "Enter Password: ";
        std::cin >> pStr;
        success = AuthenticateUser(uStr, pStr);
    } else if (mode == 3) {
        success = AuthenticateHwid();
    } else {
        std::cout << "Invalid mode selection!\\n";
        return 1;
    }

    if (!success) {
        return 1;
    }

    std::cout << "\\n[*] Starting protected application...\\n";
    std::cout << "Press Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}`;

  const pythonSnippet = `import urllib.request
import urllib.error
import json
import subprocess
import platform
import ctypes
import hashlib
import hmac
import time
import threading
import sys
import os

API_BASE = "${apiBase}"
HEARTBEAT_URL = f"{API_BASE}/api/v1/client/auth/heartbeat"
APP_ID = "${appId}"
APP_SECRET = "${appSecret}"
APP_VERSION = "${app.version || '1.0.0'}"

def check_anti_debug():
    if sys.gettrace() is not None:
        show_alert("Security Violation", "Active debugger detected! Execution terminated for safety.", is_error=True)
        os._exit(0xDEB)
    if platform.system() == "Windows":
        try:
            if ctypes.windll.kernel32.IsDebuggerPresent():
                show_alert("Security Violation", "Debugger detected! Execution terminated for safety.", is_error=True)
                os._exit(0xDEB)
            is_remote = ctypes.c_bool(False)
            ctypes.windll.kernel32.CheckRemoteDebuggerPresent(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(is_remote))
            if is_remote.value:
                show_alert("Security Violation", "Remote debugger detected! Execution terminated for safety.", is_error=True)
                os._exit(0xDEB)
        except Exception:
            pass

def verify_signature(identifier: str, status: str, expires_at: str, timestamp: int, nonce: str, signature: str) -> bool:
    if not signature or not nonce or not timestamp:
        return False
    if abs(time.time() - timestamp) > 300:
        return False
    norm_app_id = APP_ID.replace("NA-", "").strip()
    norm_secret = APP_SECRET.replace("nas_", "").strip()
    payload = f"{norm_app_id}:{identifier}:{timestamp}:{nonce}:{status}:{expires_at}"
    expected = hmac.new(norm_secret.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected.lower(), signature.lower())

def start_heartbeat(session_token: str, hwid: str):
    def heartbeat_worker():
        while True:
            time.sleep(45)
            check_anti_debug()
            try:
                hb_data = json.dumps({
                    "appId": APP_ID,
                    "appSecret": APP_SECRET,
                    "sessionToken": session_token,
                    "hwid": hwid
                }).encode('utf-8')
                req = urllib.request.Request(
                    HEARTBEAT_URL,
                    data=hb_data,
                    headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    hb_res = json.loads(resp.read().decode('utf-8'))
                    if hb_res.get("kill", False):
                        show_alert("Access Terminated", "Session revoked, paused, or expired by administrator.", is_error=True)
                        os._exit(0xDEAD)
            except urllib.error.HTTPError as e:
                try:
                    err_json = json.loads(e.read().decode('utf-8'))
                    if err_json.get("kill", False):
                        show_alert("Access Terminated", err_json.get("message", "Session revoked."), is_error=True)
                        os._exit(0xDEAD)
                except Exception:
                    pass
            except Exception:
                pass

    t = threading.Thread(target=heartbeat_worker, daemon=True)
    t.start()

def get_hwid() -> str:
    if platform.system() == "Windows":
        machine_guid = ""
        vol_serial = ""
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\\\\Microsoft\\\\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
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

def get_machine_sid() -> str:
    return get_hwid()

def show_alert(title: str, message: str, is_error: bool = True):
    if platform.system() == "Windows":
        try:
            ctypes.windll.user32.MessageBoxW(0, str(message), str(title), (16 if is_error else 48) | 0x00000000)
            return
        except Exception:
            pass
    print(f"[{title}] {message}")

def send_auth_request(endpoint: str, payload: dict, identifier: str) -> bool:
    check_anti_debug()
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        endpoint,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("success"):
                user = data.get("data", {})
                status = user.get("status", "active")
                expires_at = user.get("expires_at", "")
                ts = user.get("timestamp", 0)
                nonce = user.get("nonce", "")
                sig = user.get("signature", "")
                session_token = user.get("session_token", "")

                if not verify_signature(identifier, status, expires_at, ts, nonce, sig):
                    show_alert("Security Violation", "HMAC-SHA256 signature verification failed! Response tampering detected.", is_error=True)
                    return False

                start_heartbeat(session_token, payload.get("hwid", ""))

                print(f"\\n[+] Access Granted! Welcome, {user.get('client_name') or 'Client'}")
                print(f"[+] Days Left: {user.get('remaining_days', 0)} days")
                print(f"[+] Assigned IP: {user.get('ip', 'N/A')}")
                print("[+] HMAC-SHA256 Signature: VERIFIED")
                print("[+] Real-Time Heartbeat: RUNNING (45s Remote Kill Active)")
                return True
            else:
                msg = data.get("message", "Authentication failed")
                show_alert("Null-Auth Alert", msg, is_error=True)
                return False
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            msg = err_data.get("message", f"HTTP Error {e.code}")
            show_alert("Null-Auth Alert", msg, is_error=True)
        except Exception:
            show_alert("Null-Auth Error", f"Server HTTP {e.code}", is_error=True)
        return False
    except Exception as e:
        show_alert("Null-Auth Network Error", f"Connection failed: {str(e)}", is_error=True)
        return False

def authenticate_license(license_key: str) -> bool:
    hwid = get_hwid()
    payload = {
        "appId": APP_ID,
        "appSecret": APP_SECRET,
        "hwid": hwid,
        "licenseKey": license_key.strip(),
        "clientVersion": APP_VERSION
    }
    return send_auth_request(f"{API_BASE}/api/v1/client/auth/license", payload, license_key.strip())

def authenticate_user(username: str, password: str) -> bool:
    hwid = get_hwid()
    payload = {
        "appId": APP_ID,
        "appSecret": APP_SECRET,
        "hwid": hwid,
        "username": username.strip(),
        "password": password.strip(),
        "clientVersion": APP_VERSION
    }
    return send_auth_request(f"{API_BASE}/api/v1/client/auth/user", payload, username.strip())

def authenticate_hwid() -> bool:
    hwid = get_hwid()
    payload = {
        "appId": APP_ID,
        "appSecret": APP_SECRET,
        "hwid": hwid,
        "clientVersion": APP_VERSION
    }
    return send_auth_request(f"{API_BASE}/api/v1/client/auth/hwid", payload, hwid)

if __name__ == "__main__":
    check_anti_debug()
    print("=================================================")
    print("       🛡️ ${app.name} Protection Active          ")
    print("=================================================\\n")

    print("Select Authentication Mode:")
    print("1. License Key Authentication")
    print("2. User Account Login (Username & Password)")
    print("3. Hardware ID (HWID) Whitelist Check")
    mode = input("Select Mode (1-3): ").strip()

    success = False
    if mode == "1":
        key = input("Enter License Key: ").strip()
        success = authenticate_license(key)
    elif mode == "2":
        u_val = input("Enter Username: ").strip()
        p_val = input("Enter Password: ").strip()
        success = authenticate_user(u_val, p_val)
    elif mode == "3":
        success = authenticate_hwid()
    else:
        print("Invalid mode selection!")
        exit(1)

    if success:
        print("\\n[*] Software unlocked. Running protected application...")
    else:
        print("\\n[-] ACCESS DENIED!")
        exit(1)

    input("\\nPress Enter to exit...")
`;

  const snippets: Record<LangTab, string> = {
    csharp: csharpSnippet,
    cpp: cppSnippet,
    python: pythonSnippet,
  };

  const currentSnippet = snippets[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: LangTab; label: string; icon: any }[] = [
    { id: 'csharp', label: 'C# (.NET)', icon: Cpu },
    { id: 'cpp', label: 'C++ (Windows)', icon: FileCode2 },
    { id: 'python', label: 'Python', icon: Code },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Developer SDK Integration" size="xl">
      <div className="space-y-4">
        {/* App Context Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800/80 rounded-[8px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-none">{app.name}</h4>
              <span className="text-[11px] text-zinc-400 font-mono">App ID: {appId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] uppercase tracking-wider ${
                isLicenseMode
                  ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                  : isUserAuthMode
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                  : 'bg-purple-950/80 text-purple-400 border border-purple-800/50'
              }`}
            >
              {isLicenseMode ? 'License Key Mode' : isUserAuthMode ? 'User Account Mode' : 'HWID Whitelist Mode'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5px] bg-zinc-900 border border-zinc-800 text-zinc-300">
              v{app.version || '1.0.0'}
            </span>
          </div>
        </div>

        {/* Anti-Tamper Security Hardening Banner */}
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-[8px] flex items-start gap-3 text-xs text-emerald-300">
          <div className="w-7 h-7 rounded-[6px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold text-emerald-200 flex items-center gap-2">
              <span>Cryptographically Hardened & Anti-Tamper Armed</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-300 font-mono font-bold">
                HMAC-SHA256 + 45s Killswitch
              </span>
            </div>
            <p className="text-[11px] text-emerald-400/80 leading-relaxed">
              Resistant to MITM proxies (Fiddler/Charles), local assembly patching (x64dbg/dnSpy), and debugger single-stepping. Integrates an automatic 45s heartbeat to terminate execution immediately if an account is paused, revoked, or banned in the dashboard.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800/80 rounded-[8px] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-[8px] bg-zinc-950 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Ready-to-Paste Boilerplate
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2.5 text-xs gap-1.5 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>

          <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[380px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
            <code>{currentSnippet}</code>
          </pre>
        </div>

        {/* Security Alert Note */}
        <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-[8px] flex items-center gap-2 text-xs text-amber-300/90">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Security Notice:</strong> Keep your Secret API Key confidential. Obfuscate or virtualize client binaries (e.g., using ConfuserEx or VMProtect) before public distribution.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
