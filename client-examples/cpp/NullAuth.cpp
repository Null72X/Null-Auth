#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <array>
#include <cctype>

#pragma comment(lib, "wininet.lib")

namespace NullAuthClient {

    struct UserData {
        std::string status = "unknown";
        std::string clientName = "";
        std::string ip = "";
        std::string expires = "";
        int remainingDays = 0;
        std::string firstActivated = "";
        std::string hwid = "";
        std::string version = "";
    };

    class NullAuth {
    private:
        std::string appId;
        std::string secret;
        std::string version;
        std::string host;

        static std::string ExtractJsonString(const std::string& json, const std::string& key) {
            std::string search = "\"" + key + "\":\"";
            size_t pos = json.find(search);
            if (pos == std::string::npos) {
                search = "\"" + key + "\": \"";
                pos = json.find(search);
            }
            if (pos == std::string::npos) return "";
            size_t start = pos + search.length();
            size_t end = json.find("\"", start);
            if (end == std::string::npos) return "";
            return json.substr(start, end - start);
        }

        static int ExtractJsonInt(const std::string& json, const std::string& key) {
            std::string search = "\"" + key + "\":";
            size_t pos = json.find(search);
            if (pos == std::string::npos) return 0;
            size_t start = pos + search.length();
            while (start < json.length() && (json[start] == ' ' || json[start] == '\"')) start++;
            size_t end = start;
            while (end < json.length() && (isdigit(static_cast<unsigned char>(json[end])) || json[end] == '-')) end++;
            if (start == end) return 0;
            try {
                return std::stoi(json.substr(start, end - start));
            } catch (...) {
                return 0;
            }
        }

    public:
        UserData userData;
        bool initialized = false;

        NullAuth(
            const std::string& appId = "13026130",
            const std::string& secret = "334106af8244ffc4284df3f2c31709011681d10cfa37e67a",
            const std::string& version = "1.0.0",
            const std::string& host = "null-auth-backend.vercel.app"
        ) : appId(appId), secret(secret), version(version), host(host) {}

        static std::string GetWindowsUserSid() {
            std::array<char, 512> buffer;
            std::string result = "";
            FILE* pipe = _popen("whoami /user", "r");
            if (!pipe) return "UNKNOWN_HWID";
            while (fgets(buffer.data(), static_cast<int>(buffer.size()), pipe) != nullptr) {
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

        static void ShowPopup(const std::wstring& title, const std::wstring& message, UINT iconType = MB_ICONERROR) {
            MessageBoxW(0, message.c_str(), title.c_str(), iconType | MB_OK);
        }

        void HandleError(const std::string& response, bool showMsgbox) {
            if (!showMsgbox) return;

            std::wstring title = L"Null-Auth Security Alert";
            UINT icon = MB_ICONERROR;

            if (response.find("VERSION_MISMATCH") != std::string::npos) {
                title = L"Update Required";
                icon = MB_ICONWARNING;
            } else if (response.find("LICENSE_EXPIRED") != std::string::npos || response.find("IDENTIFIER_EXPIRED") != std::string::npos) {
                title = L"License Expired";
            } else if (response.find("LICENSE_BANNED") != std::string::npos || response.find("IDENTIFIER_BANNED") != std::string::npos) {
                title = L"Account Banned";
            } else if (response.find("LICENSE_PAUSED") != std::string::npos || response.find("IDENTIFIER_PAUSED") != std::string::npos) {
                title = L"Access Paused";
                icon = MB_ICONWARNING;
            } else if (response.find("HWID_MISMATCH") != std::string::npos) {
                title = L"HWID Mismatch";
            } else if (response.find("APPLICATION_DISABLED") != std::string::npos) {
                title = L"Application Paused";
                icon = MB_ICONWARNING;
            } else if (response.find("INVALID_APP_CREDENTIALS") != std::string::npos) {
                title = L"App Credential Error";
            }

            // Extract message string from server response or fallback to title
            std::string serverMsg = ExtractJsonString(response, "message");
            if (serverMsg.empty()) {
                serverMsg = "Authentication request failed.";
            }

            std::wstring wMsg(serverMsg.begin(), serverMsg.end());
            ShowPopup(title, wMsg, icon);
        }

        bool SendHttpsPost(const std::string& path, const std::string& jsonBody, std::string& responseOut) {
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (!hInternet) return false;

            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) { InternetCloseHandle(hInternet); return false; }

            DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, flags, 0);
            if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

            std::string headers = "Content-Type: application/json\r\n";
            bool sent = HttpSendRequestA(hRequest, headers.c_str(), static_cast<DWORD>(headers.length()), (LPVOID)jsonBody.c_str(), static_cast<DWORD>(jsonBody.length()));

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

        bool Init() {
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (!hInternet) return false;

            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) { InternetCloseHandle(hInternet); return false; }

            DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "GET", "/health", NULL, NULL, NULL, flags, 0);
            if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

            bool sent = HttpSendRequestA(hRequest, NULL, 0, NULL, 0);
            std::string response = "";
            if (sent) {
                char buffer[512];
                DWORD bytesRead = 0;
                while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                    buffer[bytesRead] = '\0';
                    response += buffer;
                }
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            initialized = (response.find("\"status\":\"ok\"") != std::string::npos);
            return initialized;
        }

        bool License(const std::string& key, bool showMsgbox = true) {
            std::string sid = GetWindowsUserSid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/license/authenticate", body, response)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
                    userData.clientName = ExtractJsonString(response, "client_name");
                    userData.ip = ExtractJsonString(response, "ip");
                    userData.expires = ExtractJsonString(response, "expires_at");
                    userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                    userData.firstActivated = ExtractJsonString(response, "first_activated_at");
                    userData.hwid = sid;
                    userData.version = version;
                    return true;
                }
            }
            HandleError(response, showMsgbox);
            return false;
        }

        bool CheckHwid(bool showMsgbox = true) {
            std::string sid = GetWindowsUserSid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/hwid/authenticate", body, response)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
                    userData.clientName = ExtractJsonString(response, "client_name");
                    userData.ip = ExtractJsonString(response, "ip");
                    userData.expires = ExtractJsonString(response, "expires_at");
                    userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                    userData.hwid = sid;
                    userData.version = version;
                    return true;
                }
            }
            HandleError(response, showMsgbox);
            return false;
        }
    };
}

int main() {
    SetConsoleTitleA("Null-Auth Single File C++ Client");

    std::cout << "=================================================\n";
    std::cout << "     🛡️ Null-Auth Single-File C++ Application    \n";
    std::cout << "=================================================\n\n";

    NullAuthClient::NullAuth auth("13026130", "334106af8244ffc4284df3f2c31709011681d10cfa37e67a", "1.0.0");

    std::cout << "[*] Connecting to Null-Auth cloud server...\n";
    if (!auth.Init()) {
        NullAuthClient::NullAuth::ShowPopup(L"Connection Error", L"Failed to connect to Null-Auth server.", MB_ICONERROR);
        return 1;
    }

    std::string sid = NullAuthClient::NullAuth::GetWindowsUserSid();
    std::cout << "[+] Connected! Server Online.\n";
    std::cout << "[+] Windows User SID: " << sid << "\n\n";

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
        success = auth.License(key, true);
    } else {
        std::cout << "\n[*] Authenticating HWID Whitelist...\n";
        success = auth.CheckHwid(true);
    }

    if (success) {
        std::cout << "\n[+] ACCESS GRANTED! Application Unlocked.\n";
        std::cout << "    Status:          " << auth.userData.status << "\n";
        if (!auth.userData.clientName.empty()) {
            std::cout << "    Client Name:     " << auth.userData.clientName << "\n";
        }
        std::cout << "    Days Remaining:  " << auth.userData.remainingDays << " days\n";
        std::cout << "    Expires At:      " << auth.userData.expires << "\n";
        if (!auth.userData.ip.empty()) {
            std::cout << "    Assigned IP:     " << auth.userData.ip << "\n";
        }
        std::cout << "    HWID Bound:      " << auth.userData.hwid << "\n";
    } else {
        std::cout << "\n[-] ACCESS DENIED!\n";
    }

    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
