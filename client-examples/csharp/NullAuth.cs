using System;
using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

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
    /// Zero external NuGet or Windows Forms dependencies (uses native Win32 P/Invoke)
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

        [DllImport("user32.dll", EntryPoint = "MessageBoxW", CharSet = CharSet.Unicode)]
        private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

        public NullAuth(string appId = "13026130", string secret = "334106af8244ffc4284df3f2c31709011681d10cfa37e67a", string version = "1.0.0", string serverUrl = "https://null-auth-backend.vercel.app")
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

        public static void ShowPopup(string title, string message, uint iconType = 0x00000010 /* MB_ICONERROR */)
        {
            try
            {
                MessageBoxW(IntPtr.Zero, message, title, iconType | 0x00000000 /* MB_OK */);
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
            else if (errCode == "INVALID_APP_CREDENTIALS") title = "App Credential Error";

            string popupMsg = string.IsNullOrEmpty(serverMessage) ? "Authentication request failed." : serverMessage;
            if (errCode == "VERSION_MISMATCH" && !string.IsNullOrEmpty(downloadUrl))
            {
                popupMsg += $"\n\nDownload Update: {downloadUrl}";
            }

            uint icon = (errCode == "VERSION_MISMATCH" || errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED" || errCode == "APPLICATION_DISABLED")
                ? 0x00000030 /* MB_ICONWARNING */
                : 0x00000010 /* MB_ICONERROR */;

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

    // =========================================================================
    // RUNNABLE USAGE SAMPLE (.NET Console)
    // =========================================================================
    internal class Program
    {
        static async Task Main(string[] args)
        {
            Console.Title = "Null-Auth Single File C# Client";
            Console.WriteLine("=================================================");
            Console.WriteLine("      🛡️ Null-Auth Single-File C# (.NET) Client   ");
            Console.WriteLine("=================================================\n");

            var auth = new NullAuth(
                appId: "13026130",
                secret: "334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
                version: "1.0.0"
            );

            Console.WriteLine("[*] Connecting to Null-Auth cloud server...");
            if (!await auth.InitAsync())
            {
                NullAuth.ShowPopup("Connection Error", "Failed to connect to Null-Auth cloud server.", 0x00000010);
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[+] Connected to Null-Auth! Version: {auth.Version}");
            Console.WriteLine($"[+] Windows Machine SID: {NullAuth.GetWindowsUserSid()}\n");
            Console.ResetColor();

            Console.WriteLine("Select Authentication Method:");
            Console.WriteLine("  1. Method 1: License Key + Machine SID Binding");
            Console.WriteLine("  2. Method 2: HWID Whitelist Only (No License Key)");
            Console.Write("\nEnter Choice (1 or 2): ");

            string choice = Console.ReadLine()?.Trim();
            bool success = false;

            if (choice == "1")
            {
                Console.Write("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ");
                string licenseKey = Console.ReadLine()?.Trim();
                Console.WriteLine("\n[*] Authenticating License Key...");
                success = await auth.LicenseAsync(licenseKey, showMsgbox: true);
            }
            else
            {
                Console.WriteLine("\n[*] Authenticating Machine HWID...");
                success = await auth.CheckHwidAsync(showMsgbox: true);
            }

            if (success)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[+] ACCESS GRANTED! Application Unlocked.");
                Console.WriteLine($"    Status:          {auth.UserData.Status}");
                if (!string.IsNullOrEmpty(auth.UserData.ClientName))
                    Console.WriteLine($"    Client Name:     {auth.UserData.ClientName}");
                Console.WriteLine($"    Days Remaining:  {auth.UserData.RemainingDays} days");
                Console.WriteLine($"    Expires At:      {auth.UserData.Expires}");
                if (!string.IsNullOrEmpty(auth.UserData.Ip))
                    Console.WriteLine($"    Assigned IP:     {auth.UserData.Ip}");
                Console.WriteLine($"    HWID Bound:      {auth.UserData.Hwid}");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] ACCESS DENIED!");
                Console.ResetColor();
            }

            Console.WriteLine("\nPress Enter to exit...");
            Console.ReadLine();
        }
    }
}
