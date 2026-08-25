#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <array>

#pragma comment(lib, "wininet.lib")

namespace NullAuthClient {

    struct UserData {
        std::string status = "unknown";
        std::string expires = "";
        int remainingDays = 0;
        std::string hwid = "";
        std::string version = "";
    };

    class NullAuth {
    private:
        std::string name;
        std::string appId;
        std::string secret;
        std::string version;
        std::string host;

    public:
        UserData userData;
        bool initialized = false;

        NullAuth(const std::string& name, const std::string& appId, const std::string& secret, const std::string& version = "1.0.0", const std::string& host = "null-auth-backend.vercel.app")
            : name(name), appId(appId), secret(secret), version(version), host(host) {}

        static std::string GetWindowsUserSid() {
            std::array<char, 512> buffer;
            std::string result = "";
            FILE* pipe = _popen("whoami /user", "r");
            if (!pipe) return "UNKNOWN_HWID";
            while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
                result += buffer.data();
            }
            _pclose(pipe);

            size_t sidPos = result.find("S-1-5-");
            if (sidPos != std::string::npos) {
                size_t endPos = result.find_first_of(" \r\n\t", sidPos);
                if (endPos != std::string::npos) return result.substr(sidPos, endPos - sidPos);
                return result.substr(sidPos);
            }
            return "UNKNOWN_HWID";
        }

        bool SendHttpsPost(const std::string& path, const std::string& jsonBody, std::string& responseOut) {
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (!hInternet) return false;

            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) { InternetCloseHandle(hInternet); return false; }

            DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, flags, 0);
            if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

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

        bool License(const std::string& key) {
            std::string sid = GetWindowsUserSid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/license/authenticate", body, response)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
                    userData.hwid = sid;
                    userData.version = version;
                    return true;
                }
            }
            return false;
        }

        bool CheckHwid() {
            std::string sid = GetWindowsUserSid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/hwid/authenticate", body, response)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
                    userData.hwid = sid;
                    userData.version = version;
                    return true;
                }
            }
            return false;
        }
    };
}

int main() {
    SetConsoleTitleA("Null-Auth Single File C++ Client");

    std::cout << "=================================================\n";
    std::cout << "     🛡️ Null-Auth Single-File C++ Application    \n";
    std::cout << "=================================================\n\n";

    NullAuthClient::NullAuth auth("MyApplication", "NA-13026130", "nas_334106af8244ffc4284df3f2c31709011681d10cfa37e67a", "1.0.0");

    std::string sid = NullAuthClient::NullAuth::GetWindowsUserSid();
    std::cout << "[+] Detected Windows User SID: " << sid << "\n\n";

    std::cout << "Select Authentication Method:\n";
    std::cout << "  1. Method 1: License Key + Bound Machine SID\n";
    std::cout << "  2. Method 2: HWID Whitelist Only (No License Key)\n";
    std::cout << "\nEnter Choice (1 or 2): ";

    int choice = 1;
    std::cin >> choice;

    bool success = false;
    if (choice == 1) {
        std::cout << "\nEnter License Key (e.g. NULL-ABCD-1234-EFGH): ";
        std::string key;
        std::cin >> key;
        std::cout << "\n[*] Authenticating License Key...\n";
        success = auth.License(key);
    } else {
        std::cout << "\n[*] Authenticating HWID Whitelist...\n";
        success = auth.CheckHwid();
    }

    if (success) {
        std::cout << "\n[+] ACCESS GRANTED! Application Unlocked.\n";
    } else {
        std::cout << "\n[-] ACCESS DENIED!\n";
    }

    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
