#pragma once
#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#include <wincrypt.h>
#include <array>
#include <cctype>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "user32.lib")

namespace NullAuthClient {
    inline bool CheckHardwareBreakpoints() {
        CONTEXT ctx;
        ZeroMemory(&ctx, sizeof(CONTEXT));
        ctx.ContextFlags = CONTEXT_DEBUG_REGISTERS;
        HANDLE hThread = GetCurrentThread();
        if (GetThreadContext(hThread, &ctx)) {
            if (ctx.Dr0 || ctx.Dr1 || ctx.Dr2 || ctx.Dr3) return true;
        }
        return false;
    }

    inline void CheckAntiDebug() {
        if (IsDebuggerPresent()) {
            MessageBoxA(0, "Debugger detected! Execution terminated for safety.", "Security Violation", MB_ICONSTOP | MB_OK);
            ExitProcess(0xDEB);
        }
        BOOL isRemote = FALSE;
        CheckRemoteDebuggerPresent(GetCurrentProcess(), &isRemote);
        if (isRemote) {
            MessageBoxA(0, "Remote debugger detected! Execution terminated for safety.", "Security Violation", MB_ICONSTOP | MB_OK);
            ExitProcess(0xDEB);
        }
        if (CheckHardwareBreakpoints()) {
            MessageBoxA(0, "Hardware breakpoint detected! Execution terminated.", "Security Violation", MB_ICONSTOP | MB_OK);
            ExitProcess(0xDEB);
        }
    }

    inline bool Sha256Raw(const BYTE* data, DWORD len, BYTE* out32) {
        HCRYPTPROV hProv = 0;
        HCRYPTHASH hHash = 0;
        DWORD cbHash = 32;
        bool ok = false;
        if (CryptAcquireContextA(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
            if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
                if (CryptHashData(hHash, data, len, 0)) {
                    if (CryptGetHashParam(hHash, HP_HASHVAL, out32, &cbHash, 0)) ok = true;
                }
                CryptDestroyHash(hHash);
            }
            CryptReleaseContext(hProv, 0);
        }
        return ok;
    }

    inline std::string Sha256(const std::string& input) {
        BYTE hash[32];
        if (!Sha256Raw((const BYTE*)input.c_str(), (DWORD)input.length(), hash)) return "";
        char hexDigits[] = "0123456789abcdef";
        std::string res = "";
        for (int i = 0; i < 32; i++) {
            res += hexDigits[(hash[i] >> 4) & 0x0F];
            res += hexDigits[hash[i] & 0x0F];
        }
        return res;
    }

    inline std::string HmacSha256(const std::string& key, const std::string& data) {
        BYTE k[64] = {0};
        if (key.length() > 64) Sha256Raw((const BYTE*)key.c_str(), (DWORD)key.length(), k);
        else memcpy(k, key.c_str(), key.length());

        BYTE k_ipad[64], k_opad[64];
        for (int i = 0; i < 64; i++) {
            k_ipad[i] = k[i] ^ 0x36;
            k_opad[i] = k[i] ^ 0x5c;
        }

        std::string innerInput((char*)k_ipad, 64);
        innerInput += data;
        BYTE innerHash[32];
        Sha256Raw((const BYTE*)innerInput.c_str(), (DWORD)innerInput.length(), innerHash);

        std::string outerInput((char*)k_opad, 64);
        outerInput.append((char*)innerHash, 32);
        BYTE outerHash[32];
        Sha256Raw((const BYTE*)outerInput.c_str(), (DWORD)outerInput.length(), outerHash);

        char hexDigits[] = "0123456789abcdef";
        std::string res = "";
        for (int i = 0; i < 32; i++) {
            res += hexDigits[(outerHash[i] >> 4) & 0x0F];
            res += hexDigits[outerHash[i] & 0x0F];
        }
        return res;
    }

    struct UserData {
        std::string status = "unknown";
        std::string clientName = "";
        std::string ip = "";
        std::string expires = "";
        int remainingDays = 0;
        std::string firstActivated = "";
        std::string hwid = "";
        std::string version = "";
        std::string sessionToken = "";
    };

    struct HeartbeatConfig {
        std::string host;
        std::string appId;
        std::string appSecret;
        std::string sessionToken;
        std::string hwid;
    };

    inline HeartbeatConfig g_hb;

    inline DWORD WINAPI HeartbeatWorker(LPVOID lpParam) {
        while (true) {
            Sleep(45000);
            CheckAntiDebug();

            HINTERNET hInternet = InternetOpenA("NullAuthGuard/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (hInternet) {
                HINTERNET hConnect = InternetConnectA(hInternet, g_hb.host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
                if (hConnect) {
                    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", "/api/v1/client/auth/heartbeat", NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0);
                    if (hRequest) {
                        std::string hbBody = "{\"appId\":\"" + g_hb.appId + "\",\"appSecret\":\"" + g_hb.appSecret + "\",\"sessionToken\":\"" + g_hb.sessionToken + "\",\"hwid\":\"" + g_hb.hwid + "\"}";
                        std::string headers = "Content-Type: application/json\r\n";
                        if (HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)hbBody.c_str(), (DWORD)hbBody.length())) {
                            char buf[1024];
                            DWORD bytesRead = 0;
                            std::string res = "";
                            while (InternetReadFile(hRequest, buf, sizeof(buf) - 1, &bytesRead) && bytesRead > 0) {
                                buf[bytesRead] = '\0';
                                res += buf;
                            }
                            if (res.find("\"kill\":true") != std::string::npos) {
                                MessageBoxA(0, "Session revoked, paused, or expired by administrator.", "Access Revoked", MB_ICONSTOP | MB_OK);
                                ExitProcess(0xDEAD);
                            }
                        }
                        InternetCloseHandle(hRequest);
                    }
                    InternetCloseHandle(hConnect);
                }
                InternetCloseHandle(hInternet);
            }
        }
        return 0;
    }

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

        static long long ExtractJsonLong(const std::string& json, const std::string& key) {
            std::string search = "\"" + key + "\":";
            size_t pos = json.find(search);
            if (pos == std::string::npos) return 0;
            size_t start = pos + search.length();
            while (start < json.length() && (json[start] == ' ' || json[start] == '\"')) start++;
            size_t end = start;
            while (end < json.length() && (isdigit(static_cast<unsigned char>(json[end])) || json[end] == '-')) end++;
            if (start == end) return 0;
            try { return std::stoll(json.substr(start, end - start)); } catch (...) { return 0; }
        }

        static int ExtractJsonInt(const std::string& json, const std::string& key) {
            return static_cast<int>(ExtractJsonLong(json, key));
        }

        static std::string CleanPrefix(const std::string& str, const std::string& prefix) {
            if (str.rfind(prefix, 0) == 0) return str.substr(prefix.length());
            return str;
        }

    public:
        UserData userData;

        NullAuth(const std::string& appId, const std::string& secret, const std::string& version = "1.0.0", const std::string& host = "nullauthbackend.vercel.app")
            : appId(appId), secret(secret), version(version), host(host) {}

        static std::string GetHwid() {
            std::string machineGuid = "";
            HKEY hKey;
            if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Cryptography", 0, KEY_READ | KEY_WOW64_64KEY, &hKey) == ERROR_SUCCESS) {
                char buf[256];
                DWORD bufSize = sizeof(buf);
                if (RegQueryValueExA(hKey, "MachineGuid", NULL, NULL, (LPBYTE)buf, &bufSize) == ERROR_SUCCESS) {
                    machineGuid = std::string(buf);
                }
                RegCloseKey(hKey);
            }

            DWORD volumeSerial = 0;
            GetVolumeInformationA("C:\\", NULL, 0, &volumeSerial, NULL, NULL, NULL, 0);

            char volBuf[32];
            sprintf_s(volBuf, sizeof(volBuf), "%08X", volumeSerial);

            std::string raw = machineGuid + ":" + std::string(volBuf);
            if (machineGuid.empty() && volumeSerial == 0) {
                char compName[MAX_COMPUTERNAME_LENGTH + 1];
                DWORD size = sizeof(compName);
                if (GetComputerNameA(compName, &size)) raw = compName;
                else raw = "UNKNOWN_HWID";
            }

            return Sha256(raw);
        }

        bool SendAuthRequest(const std::string& endpoint, const std::string& body, const std::string& identifier, bool showMsgbox) {
            HINTERNET hInternet = InternetOpenA("NullAuthGuard/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", endpoint.c_str(), NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0);

            std::string headers = "Content-Type: application/json\r\n";
            HttpSendRequestA(hRequest, headers.c_str(), (DWORD)headers.length(), (LPVOID)body.c_str(), (DWORD)body.length());

            char buffer[2048];
            DWORD bytesRead = 0;
            std::string response = "";
            while (InternetReadFile(hRequest, buffer, sizeof(buffer) - 1, &bytesRead) && bytesRead > 0) {
                buffer[bytesRead] = '\0';
                response += buffer;
            }

            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);

            if (response.find("\"success\":true") != std::string::npos) {
                std::string sig = ExtractJsonString(response, "signature");
                std::string nonce = ExtractJsonString(response, "nonce");
                long long timestamp = ExtractJsonLong(response, "timestamp");
                std::string status = ExtractJsonString(response, "status");
                if (status.empty()) status = "active";
                std::string expiresAt = ExtractJsonString(response, "expires_at");

                std::string normAppId = CleanPrefix(appId, "NA-");
                std::string normSecret = CleanPrefix(secret, "nas_");
                std::string payload = normAppId + ":" + identifier + ":" + std::to_string(timestamp) + ":" + nonce + ":" + status + ":" + expiresAt;
                std::string expectedSig = HmacSha256(normSecret, payload);

                if (sig.empty() || sig != expectedSig) {
                    if (showMsgbox) MessageBoxA(0, "Cryptographic signature verification failed! Response tampering detected.", "Security Violation", MB_ICONSTOP | MB_OK);
                    ExitProcess(0xBAD);
                }

                userData.status = "active";
                userData.clientName = ExtractJsonString(response, "client_name");
                userData.ip = ExtractJsonString(response, "ip");
                userData.expires = expiresAt;
                userData.remainingDays = ExtractJsonInt(response, "remaining_days");
                userData.hwid = GetHwid();
                userData.version = version;
                userData.sessionToken = ExtractJsonString(response, "session_token");

                g_hb.host = host;
                g_hb.appId = appId;
                g_hb.appSecret = secret;
                g_hb.sessionToken = userData.sessionToken;
                g_hb.hwid = userData.hwid;
                CreateThread(NULL, 0, HeartbeatWorker, NULL, 0, NULL);

                return true;
            }
            if (showMsgbox) MessageBoxA(0, "Authentication Failed!", "Null-Auth Error", MB_ICONERROR | MB_OK);
            return false;
        }

        bool License(const std::string& key, bool showMsgbox = true) {
            CheckAntiDebug();
            std::string hwid = GetHwid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + hwid + "\",\"version\":\"" + version + "\"}";
            return SendAuthRequest("/api/v1/client/auth/license", body, key, showMsgbox);
        }

        bool CheckHwid(bool showMsgbox = true) {
            CheckAntiDebug();
            std::string hwid = GetHwid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"hwid\":\"" + hwid + "\",\"version\":\"" + version + "\"}";
            return SendAuthRequest("/api/v1/client/auth/hwid", body, hwid, showMsgbox);
        }

        bool UserLogin(const std::string& username, const std::string& password, bool showMsgbox = true) {
            CheckAntiDebug();
            std::string hwid = GetHwid();
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"username\":\"" + username + "\",\"password\":\"" + password + "\",\"hwid\":\"" + hwid + "\",\"version\":\"" + version + "\"}";
            return SendAuthRequest("/api/v1/client/auth/user", body, username, showMsgbox);
        }
    };
}

#ifndef NULL_AUTH_NO_MAIN
int main() {
    NullAuthClient::CheckAntiDebug();
    NullAuthClient::NullAuth auth("13026130", "YOUR_RAW_SECRET", "1.0.0", "nullauthbackend.vercel.app");
    std::cout << "Select Authentication Mode:\n";
    std::cout << "1. License Key Authentication\n";
    std::cout << "2. User Account Login (Username & Password)\n";
    std::cout << "3. Hardware ID (HWID) Whitelist Check\n";
    std::cout << "Select Mode (1-3): ";
    int mode = 1;
    std::cin >> mode;
    bool success = false;
    if (mode == 1) {
        std::cout << "Enter License Key: ";
        std::string key;
        std::cin >> key;
        success = auth.License(key);
    } else if (mode == 2) {
        std::cout << "Enter Username: ";
        std::string uStr, pStr;
        std::cin >> uStr;
        std::cout << "Enter Password: ";
        std::cin >> pStr;
        success = auth.UserLogin(uStr, pStr);
    } else if (mode == 3) {
        success = auth.CheckHwid();
    } else {
        std::cout << "Invalid mode selection!\n";
        return 1;
    }
    if (!success) {
        return 1;
    }
    std::cout << "\n[+] Access Granted to " << auth.userData.clientName << "!\n";
    std::cout << "[+] Days Remaining: " << auth.userData.remainingDays << "\n";
    std::cout << "[+] HMAC-SHA256: VERIFIED\n";
    std::cout << "[+] 45s Heartbeat Remote Kill: RUNNING\n";
    std::cout << "\nPress Enter to exit...";
    std::cin.ignore();
    std::cin.get();
    return 0;
}
#endif
