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
        std::array<char, 256> buffer;
        std::string result = "";
        
        FILE* pipe = _popen("whoami /user", "r");
        if (!pipe) {
            return "UNKNOWN_HWID";
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
            result += buffer.data();
        }
        _pclose(pipe);

        // Parse line containing "S-1-5-"
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
     * Sends HTTP POST request using WinINet API
     */
    bool SendHttpPost(const std::string& host, int port, const std::string& path, const std::string& jsonBody, std::string& responseOut) {
        HINTERNET hInternet = InternetOpenA("NullAuthCppClient/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
        if (!hInternet) return false;

        HINTERNET hConnect = InternetConnectA(hInternet, host.c_construct ? host.c_str() : "127.0.0.1", (INTERNET_PORT)port, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
        if (!hConnect) {
            InternetCloseHandle(hInternet);
            return false;
        }

        HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0);
        if (!hRequest) {
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);
            return false;
        }

        std::string headers = "Content-Type: application/json\r\n";
        bool sent = HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)jsonBody.c_str(), (DWORD)jsonBody.length());

        if (sent) {
            char buffer[1024];
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
    void AuthenticateLicense(const std::string& host, int port, const std::string& appId, const std::string& appSecret, const std::string& licenseKey) {
        std::string sid = GetWindowsUserSid();
        std::cout << "[+] Detected Windows SID: " << sid << std::endl;

        std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + appSecret + "\",\"licenseKey\":\"" + licenseKey + "\",\"hwid\":\"" + sid + "\"}";
        std::string response;

        std::cout << "[*] Contacting Null-Auth Server..." << std::endl;
        if (SendHttpPost(host, port, "/api/v1/client/license/authenticate", body, response)) {
            std::cout << "\n[Response from Null-Auth Server]:\n" << response << std::endl;
            if (response.find("\"success\":true") != std::string::npos) {
                std::cout << "\n[=== ACCESS GRANTED ===]" << std::endl;
            } else {
                std::cout << "\n[=== ACCESS DENIED ===]" << std::endl;
            }
        } else {
            std::cerr << "[-] Failed to communicate with Null-Auth server." << std::endl;
        }
    }
}

int main() {
    std::cout << "=================================================\n";
    std::cout << "        Null-Auth C++ Integration Sample         \n";
    std::cout << "=================================================\n\n";

    std::string host = "127.0.0.1";
    int port = 5000;
    std::string appId = "NA-48392017";
    std::string appSecret = "nas_YOUR_APP_SECRET_HERE";

    std::cout << "Enter License Key (e.g. NULL-ABCD-1234-EFGH): ";
    std::string key;
    std::cin >> key;

    NullAuth::AuthenticateLicense(host, port, appId, appSecret, key);

    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
