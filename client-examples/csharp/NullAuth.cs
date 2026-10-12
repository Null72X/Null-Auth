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

        public NullAuth(string appId = "13026130", string secret = "334106af8244ffc4284df3f2c31709011681d10cfa37e67a", string version = "1.0.0", string serverUrl = "https://null-auth-backend.vercel.app")
        {
            AppId = appId?.Trim() ?? "";
            Secret = secret?.Trim() ?? "";
            Version = version?.Trim() ?? "1.0.0";
            ServerUrl = serverUrl?.TrimEnd('/') ?? "https://null-auth-backend.vercel.app";
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

        /// <summary>
        /// Retrieves hardware-bound machine HWID (MachineGuid + C: Volume Serial) hashed with SHA-256.
        /// </summary>
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
                    using var subKey = key.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
                    if (subKey != null)
                    {
                        machineGuid = subKey.GetValue("MachineGuid")?.ToString()?.Trim() ?? "";
                    }
                }
                catch { }

                uint volumeSerial = 0;
                try
                {
                    GetVolumeInformation("C:\\", null, 0, out volumeSerial, out _, out _, null, 0);
                }
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
                foreach (byte b in hash)
                    sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
            catch
            {
                return "UNKNOWN_HWID";
            }
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
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";

            // NativeAOT-Safe explicit JSON payload construction
            string jsonBody = $"{{\"appId\":\"{EscapeJson(AppId)}\",\"appSecret\":\"{EscapeJson(Secret)}\",\"licenseKey\":\"{EscapeJson(key?.Trim())}\",\"hwid\":\"{EscapeJson(hwid)}\",\"version\":\"{EscapeJson(Version)}\"}}";

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
            string jsonBody = $"{{\"appId\":\"{EscapeJson(AppId)}\",\"appSecret\":\"{EscapeJson(Secret)}\",\"hwid\":\"{EscapeJson(hwid)}\",\"version\":\"{EscapeJson(Version)}\"}}";

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
            string jsonBody = $"{{\"appId\":\"{EscapeJson(AppId)}\",\"appSecret\":\"{EscapeJson(Secret)}\",\"username\":\"{EscapeJson(username?.Trim())}\",\"password\":\"{EscapeJson(password?.Trim())}\",\"hwid\":\"{EscapeJson(hwid)}\",\"version\":\"{EscapeJson(Version)}\"}}";

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
                            FirstActivated = d.TryGetProperty("first_activated_at", out var fa) ? fa.GetString() : "",
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
}
