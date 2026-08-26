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
        public string Expires { get; set; } = "";
        public int RemainingDays { get; set; } = 0;
        public string FirstActivated { get; set; } = "";
        public string Hwid { get; set; } = "";
        public string Version { get; set; } = "";
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
    /// Single-File C# SDK (NativeAOT & Trimming Safe for EXEs and DLLs)
    /// Usage: var auth = new NullAuth("YOUR_APP_ID", "YOUR_SECRET", "1.0.0");
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

        public NullAuth(string appId, string secret, string version = "1.0.0", string serverUrl = "https://null-auth-backend.vercel.app")
        {
            AppId = appId?.Trim() ?? "";
            Secret = secret?.Trim() ?? "";
            Version = version?.Trim() ?? "1.0.0";
            ServerUrl = serverUrl?.TrimEnd('/') ?? "https://null-auth-backend.vercel.app";
        }

        public static string GetWindowsUserSid()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("whoami", "/user")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using Process process = Process.Start(psi);
                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();

                string[] lines = output.Split(new[] { '\\r', '\\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (string line in lines)
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

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            string sid = GetWindowsUserSid();
            string jsonBody = $"{{\"appId\":\"{AppId}\",\"appSecret\":\"{Secret}\",\"licenseKey\":\"{key?.Trim()}\",\"hwid\":\"{sid}\",\"version\":\"{Version}\"}}";

            var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
            var res = await _http.PostAsync($"{ServerUrl}/api/v1/client/license/authenticate", content);
            string resString = await res.Content.ReadAsStringAsync();

            using JsonDocument doc = JsonDocument.Parse(resString);
            bool success = doc.RootElement.GetProperty("success").GetBoolean();
            if (success && doc.RootElement.TryGetProperty("data", out var d))
            {
                UserData.Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active";
                UserData.RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0;
                return true;
            }

            if (showMsgbox) MessageBox.Show(doc.RootElement.GetProperty("message").GetString(), "Null-Auth Error");
            return false;
        }

        public async Task<bool> CheckHwidAsync(bool showMsgbox = true)
        {
            string sid = GetWindowsUserSid();
            string jsonBody = $"{{\"appId\":\"{AppId}\",\"appSecret\":\"{Secret}\",\"hwid\":\"{sid}\",\"version\":\"{Version}\"}}";

            var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
            var res = await _http.PostAsync($"{ServerUrl}/api/v1/client/hwid/authenticate", content);
            string resString = await res.Content.ReadAsStringAsync();

            using JsonDocument doc = JsonDocument.Parse(resString);
            bool success = doc.RootElement.GetProperty("success").GetBoolean();
            if (success && doc.RootElement.TryGetProperty("data", out var d))
            {
                UserData.Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active";
                UserData.RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0;
                return true;
            }

            if (showMsgbox) MessageBox.Show(doc.RootElement.GetProperty("message").GetString(), "Null-Auth Error");
            return false;
        }
    }
}`;

const CPP_SDK = `#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>

#pragma comment(lib, "wininet.lib")

namespace NullAuthClient {
    class NullAuth {
    private:
        std::string appId;
        std::string secret;
        std::string version;
        std::string host;

    public:
        NullAuth(const std::string& appId, const std::string& secret, const std::string& version = "1.0.0", const std::string& host = "null-auth-backend.vercel.app")
            : appId(appId), secret(secret), version(version), host(host) {}

        static std::string GetWindowsUserSid() {
            char buffer[512];
            std::string result = "";
            FILE* pipe = _popen("whoami /user", "r");
            if (!pipe) return "UNKNOWN_HWID";
            while (fgets(buffer, sizeof(buffer), pipe) != nullptr) result += buffer;
            _pclose(pipe);

            size_t sidPos = result.find("S-1-5-");
            if (sidPos != std::string::npos) {
                size_t endPos = result.find_first_of(" \\r\\n\\t", sidPos);
                if (endPos != std::string::npos) return result.substr(sidPos, endPos - sidPos);
                return result.substr(sidPos);
            }
            return "UNKNOWN_HWID";
        }

        bool License(const std::string& key, bool showMsgbox = true) {
            std::string sid = GetWindowsUserSid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/v1/client/license/authenticate", NULL, NULL, NULL, INTERNET_FLAG_SECURE, 0);

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

            if (response.find("\"success\":true") != std::string::npos) return true;
            if (showMsgbox) MessageBoxA(0, "Authentication Failed!", "Null-Auth Error", MB_ICONERROR | MB_OK);
            return false;
        }
    };
}`;

const PYTHON_SDK = `import urllib.request, json, subprocess, ctypes, platform

class NullAuth:
    def __init__(self, app_id: str, secret: str, version: str = "1.0.0", server_url: str = "https://null-auth-backend.vercel.app"):
        self.app_id = app_id.strip()
        self.secret = secret.strip()
        self.version = version.strip()
        self.server_url = server_url.rstrip("/")

    @staticmethod
    def get_windows_user_sid() -> str:
        try:
            output = subprocess.check_output("whoami /user", shell=True, text=True)
            for line in output.splitlines():
                if "S-1-5-" in line:
                    for part in line.split():
                        if part.startswith("S-1-5-"):
                            return part.strip()
        except Exception:
            pass
        return "UNKNOWN_HWID"

    def license(self, key: str, show_msgbox: bool = True) -> bool:
        sid = self.get_windows_user_sid()
        url = f"{self.server_url}/api/v1/client/license/authenticate"
        payload = {"appId": self.app_id, "appSecret": self.secret, "licenseKey": key.strip(), "hwid": sid, "version": self.version}
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req) as res:
                data = json.loads(res.read().decode('utf-8'))
                if data.get("success"): return True
                if showMsgbox: ctypes.windll.user32.MessageBoxW(0, data.get("message", "Error"), "Null-Auth Error", 16)
        except Exception as e:
            if show_msgbox: ctypes.windll.user32.MessageBoxW(0, str(e), "Null-Auth Network Error", 16)
        return False`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'security' | 'api' | 'sdk'>('sdk');
  const [sdkLang, setSdkLang] = useState<'csharp' | 'cpp' | 'python'>('csharp');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSdk, setCopiedSdk] = useState<string | null>(null);

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

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <Header
        title="Settings & Client SDK Integration"
        subtitle="Manage administrator security, view live API endpoints, and download single-file client SDKs for C#, C++, and Python."
      />

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm">
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

      {/* SDK Integration Tab */}
      {activeTab === 'sdk' && (
        <div className="space-y-6 animate-slide-up">
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
                  Plug-and-play single-file SDKs with dynamic Native Win32 popup error messages & SID HWID detection.
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
              <p className="font-mono text-red-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-[8px] border border-zinc-800">
                https://null-auth-backend.vercel.app/api/v1/client/license/authenticate
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
              <p className="font-mono text-purple-400 font-bold text-sm bg-zinc-900/90 p-2.5 rounded-[8px] border border-zinc-800">
                https://null-auth-backend.vercel.app/api/v1/client/hwid/authenticate
              </p>
              <p className="text-zinc-400 text-[11px]">
                Payload: <code className="text-zinc-300">{"{ appId, appSecret, hwid, version }"}</code>
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
