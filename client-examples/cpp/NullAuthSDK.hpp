#ifndef NULL_AUTH_SDK_HPP
#define NULL_AUTH_SDK_HPP

#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <array>

#pragma comment(lib, "wininet.lib")

namespace NullAuth {

    inline std::string GetWindowsUserSid() {
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

    inline bool SendHttpsPost(const std::string& host, const std::string& path, const std::string& jsonBody, std::string& responseOut) {
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
     * METHOD 1: Authenticate License Key + Version Checker
     */
    inline bool AuthenticateLicense(const std::string& host, const std::string& appId, const std::string& appSecret, const std::string& licenseKey, const std::string& version, std::string& responseOut) {
        std::string sid = GetWindowsUserSid();
        std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + appSecret + "\",\"licenseKey\":\"" + licenseKey + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
        return SendHttpsPost(host, "/api/v1/client/license/authenticate", body, responseOut);
    }

    /**
     * METHOD 2: Authenticate HWID Whitelist + Version Checker
     */
    inline bool AuthenticateHwid(const std::string& host, const std::string& appId, const std::string& appSecret, const std::string& version, std::string& responseOut) {
        std::string sid = GetWindowsUserSid();
        std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + appSecret + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
        return SendHttpsPost(host, "/api/v1/client/hwid/authenticate", body, responseOut);
    }
}

#endif // NULL_AUTH_SDK_HPP
