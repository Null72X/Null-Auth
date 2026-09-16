'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, Code, Terminal, FileCode2, ShieldAlert, Sparkles, Cpu } from 'lucide-react';

interface SdkSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
}

type LangTab = 'csharp' | 'cpp' | 'python' | 'nodejs' | 'curl';

export function SdkSnippetModal({ isOpen, onClose, app }: SdkSnippetModalProps) {
  const [activeTab, setActiveTab] = useState<LangTab>('csharp');
  const [copied, setCopied] = useState(false);

  if (!app) return null;

  const isLicenseMode = app.type === 'LICENSE';
  const appId = (app.appId || app.id || 'YOUR_APP_ID').replace(/^NA-/, '');
  const appSecret = (app.secret || 'YOUR_APP_SECRET').replace(/^nas_/, '');
  
  // Safe window origin fallback
  const apiBase = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const endpoint = isLicenseMode ? `${apiBase}/api/client/auth/license` : `${apiBase}/api/client/auth/hwid`;

  // C# Snippet (100% Standalone, Self-Contained, Zero NuGet Dependencies)
  const csharpSnippet = `// -------------------------------------------------------------
// Null-Auth C# (.NET) Integration (${app.name})
// Mode: ${isLicenseMode ? 'License Key Mode' : 'HWID Whitelist Mode'}
// 100% Standalone Single-File (NativeAOT Safe, Zero NuGet Dependencies)
// -------------------------------------------------------------
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        Console.Title = "${app.name} - Null-Auth Protected";
        Console.WriteLine("=================================================");
        Console.WriteLine("        🛡️ ${app.name} Protection Active          ");
        Console.WriteLine("=================================================\\n");

        var auth = new NullAuthClient(
            appId: "${appId}",
            secret: "${appSecret}",
            version: "${app.version || '1.0.0'}",
            serverUrl: "${apiBase}"
        );

        Console.WriteLine("[*] Authenticating with Null-Auth Guard...");

        ${
          isLicenseMode
            ? `Console.Write("Enter your License Key: ");
        string licenseKey = Console.ReadLine()?.Trim();

        var result = await auth.AuthenticateLicenseAsync(licenseKey);`
            : `var result = await auth.AuthenticateHwidAsync();`
        }

        if (result.Success)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"\\n[+] Access Granted! Welcome, {result.ClientName}");
            Console.WriteLine($"[+] Days Remaining: {result.RemainingDays} days");
            Console.WriteLine($"[+] Assigned IP: {result.Ip}");
            Console.ResetColor();

            // ---------------------------------------------------------
            // Your protected application logic starts here
            // ---------------------------------------------------------
            Console.WriteLine("\\n[*] Launching main application logic...");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"\\n[-] Authentication Failed: {result.Message} ({result.ErrorCode})");
            Console.ResetColor();
            Environment.Exit(1);
        }

        Console.WriteLine("\\nPress Enter to exit...");
        Console.ReadLine();
    }
}

// =============================================================
// Null-Auth Single-File Client Implementation (Drop-in & Ready)
// =============================================================
public class NullAuthResult
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public string ErrorCode { get; set; }
    public string ClientName { get; set; } = "Client";
    public string Ip { get; set; } = "";
    public int RemainingDays { get; set; } = 0;
}

public class NullAuthClient
{
    private readonly string _appId;
    private readonly string _secret;
    private readonly string _version;
    private readonly string _serverUrl;
    private static readonly HttpClient _http = new HttpClient();

    [DllImport("user32.dll", EntryPoint = "MessageBoxW", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    public NullAuthClient(string appId, string secret, string version = "1.0.0", string serverUrl = "${apiBase}")
    {
        _appId = appId?.Trim() ?? "";
        _secret = secret?.Trim() ?? "";
        _version = version?.Trim() ?? "1.0.0";
        _serverUrl = serverUrl?.TrimEnd('/') ?? "${apiBase}";
    }

    public static string GetWindowsUserSid()
    {
        try
        {
            var psi = new ProcessStartInfo("whoami", "/user")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var process = Process.Start(psi);
            string output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();

            foreach (string line in output.Split(new[] { '\\r', '\\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                if (line.Contains("S-1-5-"))
                {
                    string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2) return parts[parts.Length - 1].Trim();
                }
            }
        }
        catch { }
        try { return WindowsIdentity.GetCurrent().User?.Value ?? "UNKNOWN_HWID"; }
        catch { return "UNKNOWN_HWID"; }
    }

    public async Task<NullAuthResult> AuthenticateLicenseAsync(string licenseKey)
    {
        string sid = GetWindowsUserSid();
        string json = $"{{\\"appId\\":\\"{_appId}\\",\\"appSecret\\":\\"{_secret}\\",\\"licenseKey\\":\\"{licenseKey?.Trim()}\\",\\"hwid\\":\\"{sid}\\",\\"version\\":\\"{_version}\\"}}";
        return await SendRequestAsync("${endpoint}", json);
    }

    public async Task<NullAuthResult> AuthenticateHwidAsync()
    {
        string sid = GetWindowsUserSid();
        string json = $"{{\\"appId\\":\\"{_appId}\\",\\"appSecret\\":\\"{_secret}\\",\\"hwid\\":\\"{sid}\\",\\"version\\":\\"{_version}\\"}}";
        return await SendRequestAsync("${endpoint}", json);
    }

    private async Task<NullAuthResult> SendRequestAsync(string url, string jsonBody)
    {
        try
        {
            var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
            var res = await _http.PostAsync(url, content);
            string body = await res.Content.ReadAsStringAsync();

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            bool success = root.GetProperty("success").GetBoolean();
            string message = root.GetProperty("message").GetString();
            string errorCode = root.TryGetProperty("error", out var err) ? err.GetString() : null;

            string clientName = "Client";
            string ip = "";
            int remainingDays = 0;

            if (root.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Object)
            {
                if (d.TryGetProperty("client_name", out var cn)) clientName = cn.GetString();
                if (d.TryGetProperty("ip", out var ipProp)) ip = ipProp.GetString();
                if (d.TryGetProperty("remaining_days", out var rd)) remainingDays = rd.GetInt32();
            }

            if (!success)
            {
                MessageBoxW(IntPtr.Zero, message, "Null-Auth Alert", 0x00000010);
            }

            return new NullAuthResult { Success = success, Message = message, ErrorCode = errorCode, ClientName = clientName, Ip = ip, RemainingDays = remainingDays };
        }
        catch (Exception ex)
        {
            MessageBoxW(IntPtr.Zero, ex.Message, "Null-Auth Network Error", 0x00000010);
            return new NullAuthResult { Success = false, Message = ex.Message, ErrorCode = "NETWORK_ERROR" };
        }
    }
}
`;

  // C++ Snippet (100% Standalone Single-File WinINet HTTPS)
  const cppSnippet = `// -------------------------------------------------------------
// Null-Auth C++ Integration (${app.name})
// 100% Standalone Single-File (WinINet HTTPS, Zero External Libraries)
// Compile with MSVC: cl /EHsc main.cpp /link wininet.lib
// Compile with MinGW: g++ -O2 main.cpp -lwininet -o app.exe
// -------------------------------------------------------------
#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <array>
#include <cctype>

#pragma comment(lib, "wininet.lib")

// Machine SID / HWID Detection
std::string GetMachineSid() {
    std::array<char, 512> buffer;
    std::string result = "";
    FILE* pipe = _popen("whoami /user", "r");
    if (!pipe) return "UNKNOWN_HWID";
    while (fgets(buffer.data(), static_cast<int>(buffer.size()), pipe) != nullptr) {
        result += buffer.data();
    }
    _pclose(pipe);

    size_t sidPos = result.find("S-1-5-");
    if (sidPos != std::string::npos) {
        size_t endPos = result.find_first_of(" \\r\\n\\t", sidPos);
        if (endPos != std::string::npos) return result.substr(sidPos, endPos - sidPos);
        return result.substr(sidPos);
    }
    return "UNKNOWN_HWID";
}

// Lightweight JSON Parser Helper
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

int ParseJsonInt(const std::string& json, const std::string& key) {
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

bool AuthenticateNullAuth(${isLicenseMode ? 'const std::string& licenseKey' : ''}) {
    const std::string host = "${typeof window !== 'undefined' ? window.location.hostname : 'null-auth-backend.vercel.app'}";
    const std::string path = "${isLicenseMode ? '/api/client/auth/license' : '/api/client/auth/hwid'}";
    const std::string sid = GetMachineSid();

    std::string jsonPayload = "{\\"appId\\":\\"${appId}\\",\\"appSecret\\":\\"${appSecret}\","
        ${isLicenseMode ? '"\\"licenseKey\\":\\"" + licenseKey + "\\","' : '""'}
        "\\"hwid\\":\\"" + sid + "\\",\\"version\\":\\"${app.version || '1.0.0'}\\"}";

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
        std::string clientName = ParseJsonField(response, "client_name");
        int remainingDays = ParseJsonInt(response, "remaining_days");
        std::string ip = ParseJsonField(response, "ip");

        std::cout << "\\n[+] Access Granted! Welcome, " << (clientName.empty() ? "Client" : clientName) << std::endl;
        std::cout << "[+] Days Remaining: " << remainingDays << " days" << std::endl;
        if (!ip.empty()) std::cout << "[+] Assigned IP: " << ip << std::endl;
        return true;
    }

    std::string errMsg = ParseJsonField(response, "message");
    if (errMsg.empty()) errMsg = "Authentication failed.";
    std::cout << "\\n[-] Access Denied: " << errMsg << std::endl;
    MessageBoxA(0, errMsg.c_str(), "Null-Auth Alert", MB_ICONERROR | MB_OK);
    return false;
}

int main() {
    SetConsoleTitleA("${app.name} - Null-Auth Protected");
    std::cout << "=================================================\\n";
    std::cout << "        🛡️ ${app.name} Protection Active         \\n";
    std::cout << "=================================================\\n\\n";

    ${
      isLicenseMode
        ? `std::cout << "Enter License Key: ";
    std::string key;
    std::cin >> key;
    if (!AuthenticateNullAuth(key)) {
        return 1;
    }`
        : `if (!AuthenticateNullAuth()) {
        return 1;
    }`
    }

    // Main software logic
    std::cout << "\\n[*] Starting protected application...\\n";
    std::cout << "Press Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
`;

  // Python Snippet (100% Zero pip install, Pure Standard Library)
  const pythonSnippet = `# -------------------------------------------------------------
# Null-Auth Python Integration (${app.name})
# 100% Standalone (Zero 'pip install' needed - Standard Library Only)
# -------------------------------------------------------------
import urllib.request
import urllib.error
import json
import subprocess
import platform
import ctypes

API_URL = "${endpoint}"
APP_ID = "${appId}"
APP_SECRET = "${appSecret}"
APP_VERSION = "${app.version || '1.0.0'}"

def get_machine_sid() -> str:
    """Retrieves Windows User SID safely via whoami /user."""
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

def show_alert(title: str, message: str, is_error: bool = True):
    if platform.system() == "Windows":
        try:
            ctypes.windll.user32.MessageBoxW(0, str(message), str(title), (16 if is_error else 48) | 0x00000000)
            return
        except Exception:
            pass
    print(f"[{title}] {message}")

def authenticate(${isLicenseMode ? 'license_key: str' : ''}):
    sid = get_machine_sid()
    payload = {
        "appId": APP_ID,
        "appSecret": APP_SECRET,
        "hwid": sid,
        ${isLicenseMode ? '"licenseKey": license_key.strip(),' : ''}
        "clientVersion": APP_VERSION
    }

    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        API_URL,
        data=data_bytes,
        headers={"Content-Type": "application/json", "User-Agent": "NullAuthClient/2.0"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("success"):
                user = data.get("data", {})
                print(f"\\n[+] Access Granted! Welcome, {user.get('client_name') or 'Client'}")
                print(f"[+] Days Left: {user.get('remaining_days', 0)} days")
                print(f"[+] Assigned IP: {user.get('ip', 'N/A')}")
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

if __name__ == "__main__":
    print("=================================================")
    print("       🛡️ ${app.name} Protection Active          ")
    print("=================================================\\n")

    ${
      isLicenseMode
        ? `key = input("Enter License Key: ").strip()
    if authenticate(key):
        print("\\n[*] Software unlocked. Running protected application...")
    else:
        print("\\n[-] ACCESS DENIED!")
        exit(1)`
        : `if authenticate():
        print("\\n[*] Machine Authorized. Running protected application...")
    else:
        print("\\n[-] ACCESS DENIED!")
        exit(1)`
    }

    input("\\nPress Enter to exit...")
`;

  // Node.js Snippet (Native global fetch)
  const nodeSnippet = `// -------------------------------------------------------------
// Null-Auth Node.js / TypeScript Integration (${app.name})
// Built with native fetch (Node.js 18+)
// -------------------------------------------------------------
const os = require('os');

async function authenticateNullAuth() {
  const machineId = os.hostname() + "-" + os.userInfo().username;

  const payload = {
    appId: "${appId}",
    appSecret: "${appSecret}",
    hwid: machineId,
    ${isLicenseMode ? 'licenseKey: "YOUR_USER_LICENSE_KEY",' : ''}
    clientVersion: "${app.version || '1.0.0'}",
  };

  console.log("[*] Authenticating with Null-Auth Guard...");

  const response = await fetch("${endpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log("\\n[+] Access Granted! Welcome, " + (result.data.client_name || "Client"));
    console.log("[+] Days Remaining: " + result.data.remaining_days + " days");
    console.log("[+] Assigned IP: " + result.data.ip);
    return result.data;
  } else {
    console.error("\\n[-] Access Denied:", result.message || "Failed to authenticate");
    process.exit(1);
  }
}

authenticateNullAuth().catch(console.error);`;

  // cURL Snippet
  const curlSnippet = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "appId": "${appId}",
    "appSecret": "${appSecret}",
    ${isLicenseMode ? '"licenseKey": "PASTE_KEY_HERE",' : ''}
    "hwid": "USER_MACHINE_HWID",
    "clientVersion": "${app.version || '1.0.0'}"
  }'`;

  const snippets: Record<LangTab, string> = {
    csharp: csharpSnippet,
    cpp: cppSnippet,
    python: pythonSnippet,
    nodejs: nodeSnippet,
    curl: curlSnippet,
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
    { id: 'nodejs', label: 'Node.js', icon: Sparkles },
    { id: 'curl', label: 'cURL / REST', icon: Terminal },
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
                  : 'bg-purple-950/80 text-purple-400 border border-purple-800/50'
              }`}
            >
              {isLicenseMode ? 'License Key Mode' : 'HWID Whitelist Mode'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5px] bg-zinc-900 border border-zinc-800 text-zinc-300">
              v{app.version || '1.0.0'}
            </span>
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
