#include <iostream>
#include <string>
#include <vector>
#include <windows.h>
#include <wininet.h>
#include <tlhelp32.h>
#include <wincrypt.h>
#include <chrono>
#include <array>
#include <sstream>
#include <iomanip>

#pragma comment(lib, "wininet.lib")
#pragma comment(lib, "advapi32.lib")

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
        std::string appId;
        std::string secret;
        std::string version;
        std::string host;

    public:
        UserData userData;
        bool initialized = false;

        // Security Defense Switches
        bool enableAntiDebug = true;
        bool enableProcessCheck = true;
        bool enableSignature = true;

        NullAuth(const std::string& appId, const std::string& secret, const std::string& version = "1.0.0", const std::string& host = "null-auth-backend.vercel.app")
            : appId(appId), secret(secret), version(version), host(host) {}

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

        static void ShowPopup(const std::wstring& title, const std::wstring& message, UINT iconType = MB_ICONERROR) {
            MessageBoxW(0, message.c_str(), title.c_str(), iconType | MB_OK);
        }

        bool CheckDebugger() {
            if (IsDebuggerPresent()) return true;
            BOOL isRemote = FALSE;
            if (CheckRemoteDebuggerPresent(GetCurrentProcess(), &isRemote) && isRemote)
                return true;
            return false;
        }

        std::string DetectBlacklistedProcess() {
            const std::vector<std::string> tools = {
                "httpdebuggerui", "httpdebugger", "fiddler", "charles", "wireshark",
                "x64dbg", "x32dbg", "cheatengine", "ida64", "ida",
                "processhacker", "scylla", "dnspy"
            };

            HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if (hSnapshot == INVALID_HANDLE_VALUE) return "";

            PROCESSENTRY32 pe32;
            pe32.dwSize = sizeof(PROCESSENTRY32);

            if (Process32First(hSnapshot, &pe32)) {
                do {
                    std::string procName = "";
#ifdef UNICODE
                    char buf[MAX_PATH];
                    size_t converted = 0;
                    wcstombs_s(&converted, buf, pe32.szExeFile, MAX_PATH);
                    procName = buf;
#else
                    procName = pe32.szExeFile;
#endif
                    for (auto& c : procName) c = (char)tolower(c);

                    for (const auto& tool : tools) {
                        if (procName.find(tool) != std::string::npos) {
                            CloseHandle(hSnapshot);
                            return tool;
                        }
                    }
                } while (Process32Next(hSnapshot, &pe32));
            }
            CloseHandle(hSnapshot);
            return "";
        }

        void ReportThreat(const std::string& threatType, const std::string& details, const std::string& key = "", const std::string& hwid = "") {
            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"threatType\":\"" + threatType + "\",\"threatDetails\":\"" + details + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + hwid + "\",\"clientVersion\":\"" + version + "\"}";
            std::string resp;
            SendHttpsPost("/api/v1/client/security/alert", body, resp);
        }

        void EnforceSecurity(const std::string& key = "", const std::string& hwid = "") {
            if (enableAntiDebug && CheckDebugger()) {
                ReportThreat("DEBUGGER_ATTACHED", "Active debugger attached to C++ process", key, hwid);
                ShowPopup(L"Null-Auth Security Alert", L"Security violation: Debugger detected. Process terminating.", MB_ICONERROR);
                ExitProcess(0);
            }
            if (enableProcessCheck) {
                std::string tool = DetectBlacklistedProcess();
                if (!tool.empty()) {
                    ReportThreat("REVERSING_TOOL_DETECTED", "Blacklisted tool active: " + tool, key, hwid);
                    std::wstring wTool(tool.begin(), tool.end());
                    ShowPopup(L"Null-Auth Security Alert", L"Security violation: Reversing/Proxy tool (" + wTool + L") detected. Process terminating.", MB_ICONERROR);
                    ExitProcess(0);
                }
            }
        }

        static std::string ComputeHmacSha256Hex(const std::string& key, const std::string& data) {
            HCRYPTPROV hProv = 0;
            HCRYPTHASH hHash = 0;
            HCRYPTKEY hKey = 0;
            std::string result = "";

            if (!CryptAcquireContext(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
                return "";
            }

            struct {
                BLOBHEADER hdr;
                DWORD len;
                BYTE keyBytes[256];
            } keyBlob;

            keyBlob.hdr.bType = PLAINTEXTKEYBLOB;
            keyBlob.hdr.bVersion = CUR_BLOB_VERSION;
            keyBlob.hdr.reserved = 0;
            keyBlob.hdr.aiKeyAlg = CALG_RC2;
            keyBlob.len = (DWORD)min(key.length(), sizeof(keyBlob.keyBytes));
            memcpy(keyBlob.keyBytes, key.data(), keyBlob.len);

            HMAC_INFO hmacInfo;
            ZeroMemory(&hmacInfo, sizeof(hmacInfo));
            hmacInfo.HashAlgid = CALG_SHA_256;

            if (CryptImportKey(hProv, (BYTE*)&keyBlob, sizeof(BLOBHEADER) + sizeof(DWORD) + keyBlob.len, 0, CRYPT_IPSEC_HMAC_KEY, &hKey)) {
                if (CryptCreateHash(hProv, CALG_HMAC, hKey, 0, &hHash)) {
                    if (CryptSetHashParam(hHash, HP_HMAC_INFO, (BYTE*)&hmacInfo, 0)) {
                        if (CryptHashData(hHash, (const BYTE*)data.data(), (DWORD)data.length(), 0)) {
                            DWORD hashLen = 32;
                            BYTE hashBytes[32];
                            if (CryptGetHashParam(hHash, HP_HASHVAL, hashBytes, &hashLen, 0)) {
                                std::stringstream ss;
                                for (DWORD i = 0; i < hashLen; i++) {
                                    ss << std::hex << std::setw(2) << std::setfill('0') << (int)hashBytes[i];
                                }
                                result = ss.str();
                            }
                        }
                    }
                    CryptDestroyHash(hHash);
                }
                CryptDestroyKey(hKey);
            }
            CryptReleaseContext(hProv, 0);
            return result;
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
            } else if (response.find("TAMPER_DETECTED") != std::string::npos) {
                title = L"Tamper Detected";
            } else if (response.find("REPLAY_ATTACK_DETECTED") != std::string::npos) {
                title = L"Replay Attack Blocked";
            }

            // Extract message string from server response or fallback to title
            std::string msgSearch = "\"message\":\"";
            size_t msgPos = response.find(msgSearch);
            std::string serverMsg = "";
            if (msgPos != std::string::npos) {
                size_t start = msgPos + msgSearch.length();
                size_t end = response.find("\"", start);
                if (end != std::string::npos) {
                    serverMsg = response.substr(start, end - start);
                }
            }

            std::wstring wMsg(serverMsg.begin(), serverMsg.end());
            if (wMsg.empty()) wMsg = title;

            ShowPopup(title, wMsg, icon);
        }

        bool SendHttpsPost(const std::string& path, const std::string& jsonBody, std::string& responseOut, const std::string& licenseKey = "", const std::string& hwid = "") {
            HINTERNET hInternet = InternetOpenA("NullAuthCpp/2.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
            if (!hInternet) return false;

            HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
            if (!hConnect) { InternetCloseHandle(hInternet); return false; }

            DWORD flags = INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
            HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, flags, 0);
            if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

            std::string headers = "Content-Type: application/json\r\n";

            // Add HMAC signature & timestamp headers if enabled
            if (enableSignature && !secret.empty()) {
                auto nowMs = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
                std::string tsStr = std::to_string(nowMs);
                std::string cleanAppId = appId.rfind("NA-", 0) == 0 ? appId.substr(3) : appId;
                std::string stringToSign = cleanAppId + ":" + licenseKey + ":" + hwid + ":" + tsStr;
                std::string signature = ComputeHmacSha256Hex(secret, stringToSign);

                if (!signature.empty()) {
                    headers += "x-null-timestamp: " + tsStr + "\r\n";
                    headers += "x-null-signature: " + signature + "\r\n";
                }
            }

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

        bool License(const std::string& key, bool showMsgbox = true) {
            std::string sid = GetWindowsUserSid();
            EnforceSecurity(key, sid);

            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"licenseKey\":\"" + key + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/license/authenticate", body, response, key, sid)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
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
            EnforceSecurity("", sid);

            std::string body = "{\"appId\":\"" + appId + "\",\"appSecret\":\"" + secret + "\",\"hwid\":\"" + sid + "\",\"version\":\"" + version + "\"}";
            std::string response;
            if (SendHttpsPost("/api/v1/client/hwid/authenticate", body, response, "", sid)) {
                if (response.find("\"success\":true") != std::string::npos) {
                    userData.status = "active";
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
        success = auth.License(key, true);
    } else {
        std::cout << "\n[*] Authenticating HWID Whitelist...\n";
        success = auth.CheckHwid(true);
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
