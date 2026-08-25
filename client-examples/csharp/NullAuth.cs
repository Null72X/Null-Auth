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
    /// KeyAuth-style Single-File C# SDK & Application Client
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
            AppId = appId.Trim();
            Secret = secret.Trim();
            Version = version.Trim();
            ServerUrl = serverUrl.TrimEnd('/');
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

        private void HandleError(string errCode, string errMsg, string downloadUrl, bool showMsgbox)
        {
            if (!showMsgbox) return;

            if (errCode == "VERSION_MISMATCH")
            {
                string msg = $"Application Update Required!\n\n{errMsg}";
                if (!string.IsNullOrEmpty(downloadUrl)) msg += $"\n\nDownload Update: {downloadUrl}";
                ShowPopup("Update Required", msg, MessageBoxIcon.Warning);
            }
            else if (errCode == "LICENSE_EXPIRED" || errCode == "IDENTIFIER_EXPIRED")
            {
                ShowPopup("License Expired", $"Access Denied: Your license key or HWID authorization has expired.\n\n{errMsg}", MessageBoxIcon.Error);
            }
            else if (errCode == "LICENSE_BANNED" || errCode == "IDENTIFIER_BANNED")
            {
                ShowPopup("Account Banned", $"Access Denied: Your license key or machine SID has been banned.\n\n{errMsg}", MessageBoxIcon.Error);
            }
            else if (errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED")
            {
                ShowPopup("Access Paused", $"Access Denied: License or HWID access is currently paused by admin.\n\n{errMsg}", MessageBoxIcon.Warning);
            }
            else if (errCode == "HWID_MISMATCH")
            {
                ShowPopup("HWID Mismatch", $"Access Denied: License key is bound to a different machine SID.\n\n{errMsg}", MessageBoxIcon.Error);
            }
            else if (errCode == "LICENSE_NOT_FOUND" || errCode == "IDENTIFIER_NOT_FOUND")
            {
                ShowPopup("Invalid Key / HWID", $"Access Denied: Invalid license key or unauthorized machine SID.\n\n{errMsg}", MessageBoxIcon.Error);
            }
            else if (errCode == "APPLICATION_DISABLED")
            {
                ShowPopup("Application Paused", $"Access Denied: Application is currently paused by admin.\n\n{errMsg}", MessageBoxIcon.Warning);
            }
            else
            {
                ShowPopup("Null-Auth Security Alert", $"Access Denied: {errMsg}", MessageBoxIcon.Error);
            }
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

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            string sid = GetWindowsUserSid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";
            var payload = new
            {
                appId = AppId,
                appSecret = Secret,
                licenseKey = key?.Trim(),
                hwid = sid,
                version = Version
            };

            var res = await SendRequestAsync(endpoint, payload);
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
            var payload = new
            {
                appId = AppId,
                appSecret = Secret,
                hwid = sid,
                version = Version
            };

            var res = await SendRequestAsync(endpoint, payload);
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

        private async Task<NullAuthResult> SendRequestAsync(string endpoint, object payload)
        {
            try
            {
                string json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
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

    class Program
    {
        static async Task Main(string[] args)
        {
            Console.Title = "Null-Auth Single File C# Client";
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("=================================================");
            Console.WriteLine("     🛡️ Null-Auth Single-File C# Application     ");
            Console.WriteLine("=================================================");
            Console.ResetColor();

            var auth = new NullAuth("NA-13026130", "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a", "1.0.0");

            Console.WriteLine("\n[*] Connecting to Null-Auth Server...");
            if (!await auth.InitAsync())
            {
                NullAuth.ShowPopup("Connection Error", "Failed to connect to Null-Auth server.", MessageBoxIcon.Error);
                return;
            }

            Console.WriteLine($"[+] Server Connected! Local Version: {auth.Version}");
            Console.WriteLine($"[+] Detected Windows User SID: {NullAuth.GetWindowsUserSid()}");

            Console.WriteLine("\nSelect Authentication Method:");
            Console.WriteLine("  1. Method 1: License Key + Bound Machine SID");
            Console.WriteLine("  2. Method 2: HWID Whitelist Only (No License Key)");

            Console.Write("\nEnter Choice (1 or 2): ");
            string choice = Console.ReadLine()?.Trim();

            bool success;
            if (choice == "1")
            {
                Console.Write("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ");
                string key = Console.ReadLine()?.Trim();
                success = await auth.LicenseAsync(key, showMsgbox: true);
            }
            else
            {
                success = await auth.CheckHwidAsync(showMsgbox: true);
            }

            if (success)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[+] ACCESS GRANTED! Software Unlocked.");
                Console.WriteLine($"    Status: {auth.UserData.Status}");
                Console.WriteLine($"    Expires: {auth.UserData.Expires}");
                Console.WriteLine($"    Days Left: {auth.UserData.RemainingDays}");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] ACCESS DENIED!");
                Console.ResetColor();
            }

            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}
