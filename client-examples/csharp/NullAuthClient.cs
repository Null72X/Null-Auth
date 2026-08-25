using System;
using System.Diagnostics;
using System.Net.Http;
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

    public class NullAuthService
    {
        private readonly string _baseUrl;
        private readonly string _appId;
        private readonly string _appSecret;
        private static readonly HttpClient _httpClient = new HttpClient();

        public NullAuthService(string baseUrl, string appId, string appSecret)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _appId = appId;
            _appSecret = appSecret;
        }

        /// <summary>
        /// Retrieves the current Windows User SID using legitimate system command 'whoami /user'
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
            catch (Exception ex)
            {
                Console.WriteLine($"[Null-Auth Warning] Failed to fetch Windows SID via whoami: {ex.Message}");
            }

            // Fallback to System.Security.Principal
            try
            {
                return System.Security.Principal.WindowsIdentity.GetCurrent().User?.Value ?? "UNKNOWN_SID";
            }
            catch
            {
                return "UNKNOWN_HWID";
            }
        }

        /// <summary>
        /// Authenticate using License Key (App Type 1)
        /// </summary>
        public async Task<NullAuthResult> AuthenticateLicenseAsync(string licenseKey)
        {
            string hwid = GetWindowsUserSid();
            string endpoint = $"{_baseUrl}/api/v1/client/license/authenticate";

            var payload = new
            {
                appId = _appId,
                appSecret = _appSecret,
                licenseKey = licenseKey,
                hwid = hwid
            };

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
                    Status = dataElem.GetProperty("status").GetString(),
                    ExpiresAt = dataElem.GetProperty("expires_at").GetString(),
                    RemainingDays = dataElem.GetProperty("remaining_days").GetInt32(),
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

        /// <summary>
        /// Authenticate using HWID / Machine Identifier Whitelist (App Type 2)
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
                    Status = dataElem.GetProperty("status").GetString(),
                    ExpiresAt = dataElem.GetProperty("expires_at").GetString(),
                    RemainingDays = dataElem.GetProperty("remaining_days").GetInt32(),
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
    }

    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=================================================");
            Console.WriteLine("        Null-Auth C# Integration Sample          ");
            Console.WriteLine("=================================================");

            string apiUrl = "http://localhost:5000";
            string appId = "NA-48392017";
            string appSecret = "nas_YOUR_APP_SECRET_HERE";

            Console.WriteLine($"[1] Detected User SID: {NullAuthService.GetWindowsUserSid()}");

            var authService = new NullAuthService(apiUrl, appId, appSecret);

            Console.Write("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ");
            string licenseKey = Console.ReadLine();

            Console.WriteLine("\n[2] Authenticating with Null-Auth Server...");
            NullAuthResult result = await authService.AuthenticateLicenseAsync(licenseKey);

            if (result.Success)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("\n[+] ACCESS GRANTED!");
                Console.WriteLine($"    Message: {result.Message}");
                Console.WriteLine($"    Expires At: {result.Data.ExpiresAt}");
                Console.WriteLine($"    Remaining Days: {result.Data.RemainingDays}");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] ACCESS DENIED!");
                Console.WriteLine($"    Message: {result.Message}");
                Console.WriteLine($"    Error Code: {result.ErrorCode}");
                Console.ResetColor();
            }
        }
    }
}
