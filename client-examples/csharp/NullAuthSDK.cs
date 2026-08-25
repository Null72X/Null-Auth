using System;
using System.Diagnostics;
using System.Net.Http;
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
        public string RequiredVersion { get; set; }
        public string DownloadUrl { get; set; }
    }

    /// <summary>
    /// Core Null-Auth SDK Library with Automatic Version Checker
    /// Supports BOTH Auth Methods + Version Checking
    /// </summary>
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

            try { return WindowsIdentity.GetCurrent().User?.Value ?? "UNKNOWN_HWID"; }
            catch { return "UNKNOWN_HWID"; }
        }

        /// <summary>
        /// METHOD 1: Authenticate License Key + Version Checker
        /// </summary>
        public async Task<NullAuthResult> AuthenticateLicenseAsync(string licenseKey, string clientVersion = "1.0.0")
        {
            string hwid = GetWindowsUserSid();
            string endpoint = $"{_baseUrl}/api/v1/client/license/authenticate";

            var payload = new
            {
                appId = _appId,
                appSecret = _appSecret,
                licenseKey = licenseKey?.Trim(),
                hwid = hwid,
                version = clientVersion
            };

            return await SendAuthRequestAsync(endpoint, payload);
        }

        /// <summary>
        /// METHOD 2: Authenticate HWID Whitelist + Version Checker
        /// </summary>
        public async Task<NullAuthResult> AuthenticateHwidAsync(string clientVersion = "1.0.0")
        {
            string hwid = GetWindowsUserSid();
            string endpoint = $"{_baseUrl}/api/v1/client/hwid/authenticate";

            var payload = new
            {
                appId = _appId,
                appSecret = _appSecret,
                hwid = hwid,
                version = clientVersion
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
                if (root.TryGetProperty("data", out var dataElem))
                {
                    data = new NullAuthData
                    {
                        Status = dataElem.TryGetProperty("status", out var s) ? s.GetString() : "active",
                        ExpiresAt = dataElem.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                        RemainingDays = dataElem.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                        RequiredVersion = dataElem.TryGetProperty("requiredVersion", out var rv) ? rv.GetString() : null,
                        DownloadUrl = dataElem.TryGetProperty("downloadUrl", out var dl) ? dl.GetString() : null,
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
            catch (Exception)
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
}
