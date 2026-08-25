#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <array>
#include <memory>

#pragma comment(lib, "wininet.lib")

namespace NullAuth {

    /**
     * Obtains the current Windows User SID via supported command "whoami /user"
     */
    std::string GetWindowsUserSid() {
        std::array<char, 512> buffer;
        std::string result = "";
        
        FILE* pipe = _popen("whoami /user", "r");
        if (!pipe) {
            return "UNKNOWN_HWID";
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
            result += buffer.data();
        }
        _pclose(pipe);

        size_t sidPos = result.find("S-1-5-");
        if (sidPos != std::string::npos) {
            size_t endPos = result.find_first_of(" \r\n\t", sidPos);
            if (endPos != std::string::npos) {
                return result.substr(sidPos, endPos - sidPos);
            }
            return result.substr(sidPos);
        }

        return "UNKNOWN_HWID";
    }

    /**
     * Sends HTTPS POST request using WinINet API
     */
    bool SendHttpsPost(const std::string& host, const std::string& path, const std::string& jsonBody, std::string& responseOut) {
        HINTERNET hInternet = InternetOpenA("NullAuthCppSDK/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
        if (!hInternet) return false;

        HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
        if (!hConnect) {
            InternetCloseHandle(hInternet);
            return false;
        }

        DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
        HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, flags, 0);
        if (!hRequest) {
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);
            return false;
        }

        std::string headers = "Content-Type: application/json\r\n";
        bool sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)jsonBody.c_str(), (DWORD)jsonBody.length());

        if (sent) {
            char buffer[2048];
            DWORD bytesRead = 0;
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\0';
                responseOut += buffer;
            }
        }

        InternetCloseHandle(hRequest);
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hInternet);

        return sent;
    }

    /**
     * Authenticate License Key
     */
    bool AuthenticateLicense(const std::string& host, const std::string& appId, const std::string& appSecret, const std::string& licenseKey) {
        std::string sid = GetWindowsUserSid();
        std::cout << "[+] Detected Windows User SID: " << sid << std::endl;

        std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + appSecret + "\",\"licenseKey\":\"" + licenseKey + "\",\"hwid\":\"" + sid + "\"}";
        std::string response;

        std::cout << "[*] Contacting Null-Auth Cloud Server..." << std::endl;
        if (SendHttpsPost(host, "/api/v1/client/license/authenticate", body, response)) {
            std::cout << "\n[Server Response]: " << response << std::endl;
            if (response.find("\"success\":true") != std::string::npos) {
                std::cout << "\n[=== ACCESS GRANTED ===]" << std::endl;
                return true;
            } else {
                std::cout << "\n[=== ACCESS DENIED ===]" << std::endl;
                return false;
            }
        } else {
            std::cerr << "[-] Connection failed to Null-Auth server." << std::endl;
            return false;
        }
    }
}

int main() {
    SetConsoleTitleA("Null-Auth C++ Integration Client");
    std::cout << "=================================================\n";
    std::cout << "        Null-Auth C++ Integration Sample         \n";
    std::cout << "=================================================\n\n";

    std::string host = "null-auth-backend.vercel.app";
    std::string appId = "NA-48392017";
    std::string appSecret = "nas_YOUR_APP_SECRET_HERE";

    std::cout << "Enter License Key (e.g. NULL-ABCD-1234-EFGH): ";
    std::string key;
    std::cin >> key;

    NullAuth::AuthenticateLicense(host, appId, appSecret, key);

    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
