using System;
using System.Threading.Tasks;

namespace NullAuthClient
{
    /// <summary>
    /// Console Application Sample implementing BOTH Auth Methods + Version Checking:
    ///   - Method 1: License Key Authentication + Version Check
    ///   - Method 2: Direct HWID Whitelist Authentication + Version Check
    /// </summary>
    class AuthConsoleApp
    {
        private const string APP_ID = "NA-48392017";                  // Replace with your App ID
        private const string APP_SECRET = "nas_YOUR_APP_SECRET_HERE"; // Replace with your App Secret
        private const string API_URL = "https://null-auth-backend.vercel.app";
        private const string APP_VERSION = "1.0.0";                   // Current client version

        static async Task Main(string[] args)
        {
            Console.Title = "Null-Auth C# Console Client";
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("=================================================");
            Console.WriteLine($"   🛡️ Null-Auth C# Console App (Version {APP_VERSION})    ");
            Console.WriteLine("=================================================");
            Console.ResetColor();

            var sdk = new NullAuthSDK(APP_ID, APP_SECRET, API_URL);
            string userSid = NullAuthSDK.GetWindowsUserSid();

            Console.WriteLine($"\n[+] Detected Windows User SID: {userSid}");
            Console.WriteLine($"[+] Client Version: {APP_VERSION}");

            Console.WriteLine("\nSelect Authentication Method:");
            Console.WriteLine("  1. Method 1: License Key + Bound Machine SID");
            Console.WriteLine("  2. Method 2: HWID Whitelist Only (No License Key)");

            Console.Write("\nEnter Choice (1 or 2): ");
            string choice = Console.ReadLine()?.Trim();

            NullAuthResult result;
            if (choice == "1")
            {
                Console.Write("\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ");
                string key = Console.ReadLine()?.Trim();
                Console.WriteLine("\n[*] Authenticating License Key with Null-Auth Cloud Server...");
                result = await sdk.AuthenticateLicenseAsync(key, APP_VERSION);
            }
            else
            {
                Console.WriteLine("\n[*] Authenticating HWID Whitelist with Null-Auth Cloud Server...");
                result = await sdk.AuthenticateHwidAsync(APP_VERSION);
            }

            Console.WriteLine("\n-------------------------------------------------");

            if (result.ErrorCode == "VERSION_MISMATCH")
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[!] CRITICAL: VERSION MISMATCH DETECTED!");
                Console.WriteLine($"    Your Version: {APP_VERSION}");
                Console.WriteLine($"    Required Version: {result.Data?.RequiredVersion}");
                if (!string.IsNullOrEmpty(result.Data?.DownloadUrl))
                {
                    Console.WriteLine($"    Download Update: {result.Data.DownloadUrl}");
                }
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] EXECUTION TERMINATED: Application is outdated.");
                Console.ResetColor();
                Console.ReadKey();
                return;
            }

            if (result.Success)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] ACCESS GRANTED! Application Successfully Unlocked.");
                Console.WriteLine($"    Status: {result.Data?.Status}");
                Console.WriteLine($"    Expires At: {result.Data?.ExpiresAt}");
                Console.WriteLine($"    Remaining Days: {result.Data?.RemainingDays} Days");
                Console.ResetColor();

                Console.WriteLine("\n[+] Starting Main Software Application Payload...");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[-] ACCESS DENIED! Reason: {result.Message}");
                Console.ResetColor();
            }

            Console.WriteLine("-------------------------------------------------");
            Console.WriteLine("\nPress any key to exit...");
            Console.ReadKey();
        }
    }
}
