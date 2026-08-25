using System;
using System.Diagnostics;
using System.Net.Http;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

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
        public UserData Data { get; set; }
    }

    /// <summary>
    /// KeyAuth-style Single-File C# SDK & Application Client
    /// </summary>
    public class NullAuth
    {
        public string Name { get; }
        public string AppId { get; }
        public string Secret { get; }
        public string Version { get; }
        public string ServerUrl { get; }
        public UserData UserData { get; private set; } = new UserData();
        public bool Initialized { get; private set; } = false;

        private static readonly HttpClient _http = new HttpClient();

        public NullAuth(string name, string appId, string secret, string version = "1.0.0", string serverUrl = "https://null-auth-backend.vercel.app")
        {
            Name = name;
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

        public async Task<bool> LicenseAsync(string key)
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
            return false;
        }

        public async Task<bool> CheckHwidAsync()
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
                if (root.TryGetProperty("data", out var d))
                {
                    data = new UserData
                    {
                        Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active",
                        Expires = d.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                        RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                    };
                }

                return new NullAuthResult { Success = success, Message = message, ErrorCode = errorCode, Data = data };
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

            var auth = new NullAuth("MyApplication", "NA-13026130", "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a", "1.0.0");

            Console.WriteLine("\n[*] Connecting to Null-Auth Server...");
            if (!await auth.InitAsync())
            {
                Console.WriteLine("[-] Server connection failed!");
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
                success = await auth.LicenseAsync(key);
            }
            else
            {
                success = await auth.CheckHwidAsync();
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
