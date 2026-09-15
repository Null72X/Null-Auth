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
  const [activeTab, setActiveTab] = useState<'webhook' | 'sdk' | 'api' | 'security'>('webhook');
  const [sdkLang, setSdkLang] = useState<'csharp' | 'cpp' | 'python'>('csharp');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSdk, setCopiedSdk] = useState<string | null>(null);

  // Discord Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [maskedWebhookUrl, setMaskedWebhookUrl] = useState('');
  const [hasWebhook, setHasWebhook] = useState(false);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [notifyAuthSuccess, setNotifyAuthSuccess] = useState(true);
  const [notifyAuthFail, setNotifyAuthFail] = useState(true);
  const [notifyLicenseCreate, setNotifyLicenseCreate] = useState(true);
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
          setNotifyAuthSuccess(d.notifyAuthSuccess);
          setNotifyAuthFail(d.notifyAuthFail);
          setNotifyLicenseCreate(d.notifyLicenseCreate);
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
          notifyAuthSuccess,
          notifyAuthFail,
          notifyLicenseCreate,
        }),
      });
      if (res.success) {
        setWebhookMessage({ type: 'success', text: 'Discord Webhook configuration saved successfully!' });
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
        setWebhookMessage({ type: 'success', text: '🛰️ Test ping sent to Discord! Check your channel.' });
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

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <Header
        title="Settings & Client SDK Integration"
        subtitle="Manage administrator security, view live API endpoints, and download single-file client SDKs for C#, C++, and Python."
      />

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm flex-wrap">
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

            <form onSubmit={handleSaveWebhook} className="space-y-5">
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
                  In Discord: Go to <strong>Server Settings</strong> &gt; <strong>Integrations</strong> &gt; <strong>Webhooks</strong> &gt; <strong>New Webhook</strong> &gt; <strong>Copy Webhook URL</strong>.
                </span>
              </div>

              {/* Event Subscriptions Toggles */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Event Alert Subscriptions
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Alert 1: License Provisioning */}
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
                        <span className="text-xs font-bold text-zinc-200">🔑 License Created</span>
                        <input
                          type="checkbox"
                          checked={notifyLicenseCreate}
                          onChange={() => {}}
                          className="accent-indigo-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Dispatches when new license keys are generated or provisioned.
                      </p>
                    </div>
                  </div>

                  {/* Alert 2: Security Violations */}
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
                        Immediate alerts on HWID mismatch, version mismatch, or banned attempts.
                      </p>
                    </div>
                  </div>

                  {/* Alert 3: Client Logins */}
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
                        <span className="text-xs font-bold text-zinc-200">✅ Auth Success</span>
                        <input
                          type="checkbox"
                          checked={notifyAuthSuccess}
                          onChange={() => {}}
                          className="accent-emerald-500 rounded"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Notifications for authorized client logins with Client Name and IP.
                      </p>
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
