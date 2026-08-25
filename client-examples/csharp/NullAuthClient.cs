using System;
using System.Diagnostics;
using System.Net.Http;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace NullAuthClient
{
    public class NullAuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string ErrorCode { get; set; }
        public NullAuthData Data { get; set; }
    }

    public class NullAuthData
    {
        public string Status { get; set; }
        public string ExpiresAt { get; set; }
        public int RemainingDays { get; set; }
        public string FirstActivatedAt { get; set; }
    }

    public class NullAuthSDK
    {
        private readonly string _baseUrl;
        private readonly string _appId;
        private readonly string _appSecret;
        private static readonly HttpClient _httpClient = new HttpClient();

        public NullAuthSDK(string appId, string appSecret, string baseUrl = "https://null-auth-backend.vercel.app")
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _appId = appId;
            _appSecret = appSecret;
        }

        /// <summary>
        /// Retrieves the Windows User SID using legitimate 'whoami /user' fallback to WindowsIdentity.
        /// </summary>
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

                using (Process process = Process.Start(psi))
                {
                    string output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();

                    string[] lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (string line in lines)
                    {
                        if (line.Contains("S-1-5-"))
                        {
                            string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 2)
                            {
                                return parts[parts.Length - 1].Trim();
                            }
                        }
                    }
                }
            }
            catch { }

            try
            {
                return WindowsIdentity.GetCurrent().User?.Value ?? "UNKNOWN_SID";
            }
            catch
            {
                return "UNKNOWN_HWID";
            }
        }

        /// <summary>
        /// Authenticates using License Key (App Mode 1)
        /// </summary>
        public async Task<NullAuthResult> AuthenticateLicenseAsync(string licenseKey)
        {
            string hwid = GetWindowsUserSid();
            string endpoint = $"{_baseUrl}/api/v1/client/license/authenticate";

            var payload = new
            {
                appId = _appId,
                appSecret = _appSecret,
                licenseKey = licenseKey?.Trim(),
                hwid = hwid
            };

            return await SendAuthRequestAsync(endpoint, payload);
        }

        /// <summary>
        /// Authenticates using direct HWID Whitelist Access (App Mode 2)
        /// </summary>
        public async Task<NullAuthResult> AuthenticateHwidAsync()
        {
            string hwid = GetWindowsUserSid();
            string endpoint = $"{_baseUrl}/api/v1/client/hwid/authenticate";

            var payload = new
            {
                appId = _appId,
                appSecret = _appSecret,
                hwid = hwid
            };

            return await SendAuthRequestAsync(endpoint, payload);
        }

        private async Task<NullAuthResult> SendAuthRequestAsync(string endpoint, object payload)
        {
            try
            {
                string jsonBody = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await _httpClient.PostAsync(endpoint, content);
                string responseString = await response.Content.ReadAsStringAsync();

                using JsonDocument doc = JsonDocument.Parse(responseString);
                JsonElement root = doc.RootElement;

                bool success = root.GetProperty("success").GetBoolean();
                string message = root.GetProperty("message").GetString();
                string errorCode = root.TryGetProperty("error", out var errElem) ? errElem.GetString() : null;

                NullAuthData data = null;
                if (success && root.TryGetProperty("data", out var dataElem))
                {
                    data = new NullAuthData
                    {
                        Status = dataElem.TryGetProperty("status", out var s) ? s.GetString() : "active",
                        ExpiresAt = dataElem.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                        RemainingDays = dataElem.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                        FirstActivatedAt = dataElem.TryGetProperty("first_activated_at", out var f) ? f.GetString() : null,
                    };
                }

                return new NullAuthResult
                {
                    Success = success,
                    Message = message,
                    ErrorCode = errorCode,
                    Data = data
                };
            }
            catch (Exception ex)
            {
                return new NullAuthResult
                {
                    Success = false,
                    Message = "Connection failed to Null-Auth server.",
                    ErrorCode = "NETWORK_ERROR",
                    Data = null
                };
            }
        }
    }

    class Program
    {
        static async Task Main(string[] args)
        {
            Console.Title = "Null-Auth C# Integration Client";
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("=================================================");
            Console.WriteLine("        Null-Auth C# Integration Sample          ");
            Console.WriteLine("=================================================");
            Console.ResetColor();

            // Set your App ID and Secret Key from Null-Auth Dashboard
            string appId = "NA-48392017";
            string appSecret = "nas_YOUR_APP_SECRET_HERE";
            string apiUrl = "https://null-auth-backend.vercel.app";

            string userSid = NullAuthSDK.GetWindowsUserSid();
            Console.WriteLine($"[+] Detected Windows User SID: {userSid}");

            var sdk = new NullAuthSDK(appId, appSecret, apiUrl);

            Console.Write("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ");
            string licenseKey = Console.ReadLine();

            Console.WriteLine("\n[*] Authenticating with Null-Auth Cloud Server...");
            NullAuthResult result = await sdk.AuthenticateLicenseAsync(licenseKey);

            if (result.Success)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[+] ACCESS GRANTED! Application Unlocked.");
                Console.WriteLine($"    Status: {result.Data.Status}");
                Console.WriteLine($"    Expires At: {result.Data.ExpiresAt}");
                Console.WriteLine($"    Remaining Days: {result.Data.RemainingDays} days");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] ACCESS DENIED!");
                Console.WriteLine($"    Reason: {result.Message}");
                Console.WriteLine($"    Error Code: {result.ErrorCode}");
                Console.ResetColor();
            }

            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}
