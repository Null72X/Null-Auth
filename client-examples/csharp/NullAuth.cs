using System;
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

                string[] lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
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
                popupMsg += $"\n\nDownload Update: {downloadUrl}";
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
            return str.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
        }

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            string sid = GetWindowsUserSid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\"appId\":\"{EscapeJson(AppId)}\",\"appSecret\":\"{EscapeJson(Secret)}\",\"licenseKey\":\"{EscapeJson(key?.Trim())}\",\"hwid\":\"{EscapeJson(sid)}\",\"version\":\"{EscapeJson(Version)}\"}}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                UserData = res.Data;
                UserData.Hwid = sid;
                UserData.Version = Version;
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> CheckHwidAsync(bool showMsgbox = true)
        {
            string sid = GetWindowsUserSid();
            string endpoint = $"{ServerUrl}/api/v1/client/hwid/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\"appId\":\"{EscapeJson(AppId)}\",\"appSecret\":\"{EscapeJson(Secret)}\",\"hwid\":\"{EscapeJson(sid)}\",\"version\":\"{EscapeJson(Version)}\"}}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                UserData = res.Data;
                UserData.Hwid = sid;
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
                            Expires = d.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                            RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
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
}
