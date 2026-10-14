using System;
using System.Diagnostics;
using System.Net.Http;
using System.Security.Cryptography;
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
        public string SessionToken { get; set; } = "";
    }

    public class NullAuthResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string ErrorCode { get; set; }
        public string DownloadUrl { get; set; }
        public UserData Data { get; set; }
    }

    public class NullAuth
    {
        public string AppId { get; }
        public string Secret { get; }
        public string Version { get; }
        public string ServerUrl { get; }
        public UserData UserData { get; private set; } = new UserData();
        public bool Initialized { get; private set; } = false;

        private static readonly HttpClient _http = new HttpClient();
        private System.Threading.Timer _heartbeatTimer;

        public NullAuth(string appId, string secret, string version = "1.0.0", string serverUrl = "https://nullauthbackend.vercel.app")
        {
            AppId = appId?.Trim() ?? "";
            Secret = secret?.Trim() ?? "";
            Version = version?.Trim() ?? "1.0.0";
            ServerUrl = serverUrl?.TrimEnd('/') ?? "https://nullauthbackend.vercel.app";
        }

        [System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        private static extern bool IsDebuggerPresent();

        [System.Runtime.InteropServices.DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        private static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, ref bool isDebuggerPresent);

        public static void CheckAntiDebug()
        {
            if (Debugger.IsAttached || IsDebuggerPresent())
            {
                ShowPopup("Security Violation", "Active debugger detected! Execution terminated for safety.", MessageBoxIcon.Stop);
                Environment.Exit(0xDEB);
            }

            bool isRemoteDebugger = false;
            try
            {
                CheckRemoteDebuggerPresent(Process.GetCurrentProcess().Handle, ref isRemoteDebugger);
                if (isRemoteDebugger)
                {
                    ShowPopup("Security Violation", "Remote debugger detected! Execution terminated for safety.", MessageBoxIcon.Stop);
                    Environment.Exit(0xDEB);
                }
            }
            catch { }
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
                    if (subKey != null) machineGuid = subKey.GetValue("MachineGuid")?.ToString()?.Trim() ?? "";
                }
                catch { }

                uint volumeSerial = 0;
                try { GetVolumeInformation("C:\\", null, 0, out volumeSerial, out _, out _, null, 0); }
                catch { }

                string rawHwid = $"{machineGuid}:{volumeSerial:X8}";
                if (string.IsNullOrWhiteSpace(machineGuid) && volumeSerial == 0)
                {
                    try { rawHwid = WindowsIdentity.GetCurrent().User?.Value ?? Environment.MachineName; }
                    catch { rawHwid = Environment.MachineName; }
                }

                using var sha256 = SHA256.Create();
                byte[] bytes = Encoding.UTF8.GetBytes(rawHwid);
                byte[] hash = sha256.ComputeHash(bytes);
                var sb = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
            catch { return "UNKNOWN_HWID"; }
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
            else if (errCode == "LICENSE_EXPIRED" || errCode == "IDENTIFIER_EXPIRED" || errCode == "USER_EXPIRED" || errCode == "TRIAL_EXPIRED") title = "License Expired";
            else if (errCode == "LICENSE_BANNED" || errCode == "IDENTIFIER_BANNED" || errCode == "USER_BANNED") title = "Account Banned";
            else if (errCode == "LICENSE_PAUSED" || errCode == "IDENTIFIER_PAUSED" || errCode == "USER_PAUSED") title = "Access Paused";
            else if (errCode == "HWID_MISMATCH") title = "HWID Mismatch";
            else if (errCode == "LICENSE_NOT_FOUND" || errCode == "IDENTIFIER_NOT_FOUND" || errCode == "USER_NOT_FOUND") title = "Invalid Key / HWID";
            else if (errCode == "APPLICATION_DISABLED") title = "Application Paused";
            else if (errCode == "TAMPERING_DETECTED") title = "Security Violation: Tampered Response";

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

        public static string ComputeHmacSha256(string key, string message)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
            var sb = new StringBuilder(hash.Length * 2);
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private bool VerifyResponseSignature(string identifier, string status, string expiresAt, long timestamp, string nonce, string signature)
        {
            if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(nonce) || timestamp == 0) return false;
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (Math.Abs(now - timestamp) > 300) return false;

            string normAppId = AppId.Replace("NA-", "").Trim();
            string normSecret = Secret.Replace("nas_", "").Trim();
            string payload = $"{normAppId}:{identifier}:{timestamp}:{nonce}:{status}:{expiresAt}";
            string expectedSig = ComputeHmacSha256(normSecret, payload);
            return string.Equals(expectedSig, signature, StringComparison.OrdinalIgnoreCase);
        }

        private void StartHeartbeat(string sessionToken)
        {
            _heartbeatTimer?.Dispose();
            _heartbeatTimer = new System.Threading.Timer(async _ =>
            {
                try
                {
                    CheckAntiDebug();
                    string hwid = GetHwid();
                    string body = "{\"appId\":\"" + EscapeJson(AppId) + "\",\"appSecret\":\"" + EscapeJson(Secret) + "\",\"sessionToken\":\"" + EscapeJson(sessionToken) + "\",\"hwid\":\"" + EscapeJson(hwid) + "\"}";
                    var content = new StringContent(body, Encoding.UTF8, "application/json");
                    var response = await _http.PostAsync($"{ServerUrl}/api/v1/client/auth/heartbeat", content);
                    string resStr = await response.Content.ReadAsStringAsync();

                    using var doc = JsonDocument.Parse(resStr);
                    var root = doc.RootElement;
                    bool kill = root.TryGetProperty("kill", out var k) && k.GetBoolean();
                    if (!response.IsSuccessStatusCode || kill)
                    {
                        ShowPopup("Access Terminated", "Session revoked, paused, or expired by administrator. Terminating process.", MessageBoxIcon.Warning);
                        Environment.Exit(0xDEAD);
                    }
                }
                catch { }
            }, null, TimeSpan.FromSeconds(45), TimeSpan.FromSeconds(45));
        }

        public async Task<bool> LicenseAsync(string key, bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/license/authenticate";
            string cleanKey = key?.Trim() ?? "";

            string jsonBody = "{\"appId\":\"" + EscapeJson(AppId) + "\",\"appSecret\":\"" + EscapeJson(Secret) + "\",\"licenseKey\":\"" + EscapeJson(cleanKey) + "\",\"hwid\":\"" + EscapeJson(hwid) + "\",\"version\":\"" + EscapeJson(Version) + "\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(cleanKey, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> CheckHwidAsync(bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/hwid/authenticate";

            string jsonBody = "{\"appId\":\"" + EscapeJson(AppId) + "\",\"appSecret\":\"" + EscapeJson(Secret) + "\",\"hwid\":\"" + EscapeJson(hwid) + "\",\"version\":\"" + EscapeJson(Version) + "\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(hwid, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public async Task<bool> UserLoginAsync(string username, string password, bool showMsgbox = true)
        {
            CheckAntiDebug();
            string hwid = GetHwid();
            string endpoint = $"{ServerUrl}/api/v1/client/user/authenticate";
            string cleanUser = username?.Trim() ?? "";

            string jsonBody = "{\"appId\":\"" + EscapeJson(AppId) + "\",\"appSecret\":\"" + EscapeJson(Secret) + "\",\"username\":\"" + EscapeJson(cleanUser) + "\",\"password\":\"" + EscapeJson(password?.Trim()) + "\",\"hwid\":\"" + EscapeJson(hwid) + "\",\"version\":\"" + EscapeJson(Version) + "\"}";

            var res = await SendRequestAsync(endpoint, jsonBody);
            if (res.Success && res.Data != null)
            {
                if (!VerifyResponseSignature(cleanUser, res.Data.Status, res.Data.Expires, res.RawTimestamp, res.RawNonce, res.RawSignature))
                {
                    HandleError("TAMPERING_DETECTED", "Cryptographic signature mismatch! Response has been intercepted or modified.", null, showMsgbox);
                    return false;
                }

                UserData = res.Data;
                UserData.Hwid = hwid;
                UserData.Version = Version;
                StartHeartbeat(res.Data.SessionToken);
                return true;
            }

            HandleError(res.ErrorCode, res.Message, res.DownloadUrl, showMsgbox);
            return false;
        }

        public class RawResponse : NullAuthResult
        {
            public long RawTimestamp { get; set; }
            public string RawNonce { get; set; }
            public string RawSignature { get; set; }
        }

        private async Task<RawResponse> SendRequestAsync(string endpoint, string jsonBody)
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
                long timestamp = 0;
                string nonce = null;
                string signature = null;

                if (root.TryGetProperty("data", out var d))
                {
                    if (d.ValueKind == JsonValueKind.Object)
                    {
                        if (d.TryGetProperty("downloadUrl", out var dl)) downloadUrl = dl.GetString();
                        if (d.TryGetProperty("timestamp", out var ts)) timestamp = ts.GetInt64();
                        if (d.TryGetProperty("nonce", out var n)) nonce = n.GetString();
                        if (d.TryGetProperty("signature", out var sig)) signature = sig.GetString();

                        data = new UserData
                        {
                            Status = d.TryGetProperty("status", out var s) ? s.GetString() : "active",
                            ClientName = d.TryGetProperty("client_name", out var cn) ? cn.GetString() : "",
                            Expires = d.TryGetProperty("expires_at", out var e) ? e.GetString() : "",
                            RemainingDays = d.TryGetProperty("remaining_days", out var r) ? r.GetInt32() : 0,
                            Ip = d.TryGetProperty("ip", out var ip) ? ip.GetString() : "",
                            SessionToken = d.TryGetProperty("session_token", out var st) ? st.GetString() : "",
                        };
                    }
                }

                return new RawResponse
                {
                    Success = success,
                    Message = message,
                    ErrorCode = errorCode,
                    DownloadUrl = downloadUrl,
                    Data = data,
                    RawTimestamp = timestamp,
                    RawNonce = nonce,
                    RawSignature = signature
                };
            }
            catch (Exception ex)
            {
                return new RawResponse { Success = false, Message = ex.Message, ErrorCode = "NETWORK_ERROR" };
            }
        }
    }
}

class Program
{
    static async Task Main()
    {
        Console.Title = "Null-Auth Protected App";
        Console.WriteLine("=================================================");
        Console.WriteLine("        Protection Active                        ");
        Console.WriteLine("=================================================\n");

        NullAuthClient.NullAuth.CheckAntiDebug();

        var auth = new NullAuthClient.NullAuth(
            appId: "YOUR_APP_ID",
            secret: "YOUR_APP_SECRET",
            version: "1.0.0",
            serverUrl: "https://nullauthbackend.vercel.app"
        );

        Console.WriteLine("[*] Authenticating with Null-Auth Guard...");

        Console.WriteLine("Select Authentication Mode:");
        Console.WriteLine("1. License Key Authentication");
        Console.WriteLine("2. User Account Login (Username & Password)");
        Console.WriteLine("3. Hardware ID (HWID) Whitelist Check");
        Console.Write("Select Mode (1-3): ");
        string mode = Console.ReadLine()?.Trim();

        bool success = false;
        if (mode == "1")
        {
            Console.Write("Enter License Key: ");
            string key = Console.ReadLine()?.Trim();
            success = await auth.LicenseAsync(key);
        }
        else if (mode == "2")
        {
            Console.Write("Enter Username: ");
            string user = Console.ReadLine()?.Trim();
            Console.Write("Enter Password: ");
            string pass = Console.ReadLine()?.Trim();
            success = await auth.UserLoginAsync(user, pass);
        }
        else if (mode == "3")
        {
            success = await auth.CheckHwidAsync();
        }
        else
        {
            Console.WriteLine("Invalid mode selection!");
            return;
        }

        if (success)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"\n[+] Access Granted! Welcome, {auth.UserData.ClientName}");
            Console.WriteLine($"[+] Days Remaining: {auth.UserData.RemainingDays} days");
            Console.WriteLine($"[+] Assigned IP: {auth.UserData.Ip}");
            Console.WriteLine("[+] HMAC-SHA256 Response Signature: VERIFIED");
            Console.WriteLine("[+] Real-Time Heartbeat: RUNNING (45s Remote Kill Active)");
            Console.ResetColor();

            Console.WriteLine("\n[*] Launching main application logic...");
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\n[-] Authentication Failed!");
            Console.ResetColor();
            Environment.Exit(1);
        }

        Console.WriteLine("\nPress Enter to exit...");
        Console.ReadLine();
    }
}
