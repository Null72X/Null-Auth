#include <iostream>
#include <string>
#include "NullAuthSDK.hpp"

/**
 * C++ Console Application Sample with Version Checker:
 *   - Method 1: License Key Authentication + Version Validation
 *   - Method 2: Direct HWID Whitelist Authentication + Version Validation
 */

int main() {
    SetConsoleTitleA("Null-Auth C++ Console Client");

    std::string version = "1.0.0"; // Current local application version

    std::cout << "=================================================\n";
    std::cout << "  🛡️ Null-Auth C++ Console Client (v" << version << ")   \n";
    std::cout << "=================================================\n\n";

    std::string host = "null-auth-backend.vercel.app";
    std::string appId = "NA-48392017";                  // Replace with your App ID
    std::string appSecret = "nas_YOUR_APP_SECRET_HERE"; // Replace with your App Secret

    std::string userSid = NullAuth::GetWindowsUserSid();
    std::cout << "[+] Detected Windows User SID: " << userSid << "\n";
    std::cout << "[+] Client Version: " << version << "\n\n";

    std::cout << "Select Authentication Method:\n";
    std::cout << "  1. Method 1: License Key + Bound Machine SID\n";
    std::cout << "  2. Method 2: HWID Whitelist Only (No License Key)\n";
    std::cout << "\nEnter Choice (1 or 2): ";
    
    int choice = 1;
    std::cin >> choice;

    std::string response;
    bool sent = false;

    if (choice == 1) {
        std::cout << "\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ";
        std::string licenseKey;
        std::cin >> licenseKey;

        std::cout << "\n[*] Authenticating License Key with Null-Auth Cloud Server...\n";
        sent = NullAuth::AuthenticateLicense(host, appId, appSecret, licenseKey, version, response);
    } else {
        std::cout << "\n[*] Authenticating HWID Whitelist with Null-Auth Cloud Server...\n";
        sent = NullAuth::AuthenticateHwid(host, appId, appSecret, version, response);
    }

    std::cout << "\n-------------------------------------------------\n";
    std::cout << "[Server Raw Response]: " << response << "\n";

    // Version Mismatch Check
    if (response.find("VERSION_MISMATCH") != std::string::npos) {
        std::cout << "\n[!] CRITICAL: VERSION MISMATCH DETECTED!\n";
        std::cout << "[-] EXECUTION TERMINATED: Application is outdated.\n";
        std::cout << "-------------------------------------------------\n";
        std::cout << "\nPress Enter to exit...";
        std::cin.ignore();
        std::cin.get();
        return 1;
    }

    if (sent && response.find("\"success\":true") != std::string::npos) {
        std::cout << "\n[+] ACCESS GRANTED! Application Successfully Unlocked.\n";
        std::cout << "[+] Starting Main Software Application Payload...\n";
    } else {
        std::cout << "\n[-] ACCESS DENIED! Invalid Credentials or Unauthorized Machine.\n";
    }

    std::cout << "-------------------------------------------------\n";
    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
