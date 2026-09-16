'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, Code, Terminal, FileCode2, ShieldAlert, Sparkles, Cpu } from 'lucide-react';

interface SdkSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: any;
}

type LangTab = 'csharp' | 'cpp' | 'python' | 'nodejs' | 'curl';

export function SdkSnippetModal({ isOpen, onClose, app }: SdkSnippetModalProps) {
  const [activeTab, setActiveTab] = useState<LangTab>('csharp');
  const [copied, setCopied] = useState(false);

  if (!app) return null;

  const isLicenseMode = app.type === 'LICENSE';
  const appId = app.appId || app.id || 'YOUR_APP_ID';
  const appSecret = app.secret || 'YOUR_APP_SECRET';
  
  // Safe window origin fallback
  const apiBase = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const endpoint = isLicenseMode ? `${apiBase}/api/client/auth/license` : `${apiBase}/api/client/auth/hwid`;

  // C# Snippet
  const csharpSnippet = `// -------------------------------------------------------------
// Null-Auth Integration (${app.name} - ${isLicenseMode ? 'License Mode' : 'HWID Whitelist Mode'})
// -------------------------------------------------------------
using System;
using System.Threading.Tasks;
using NullAuth;

class Program
{
    static async Task Main()
    {
        var auth = new NullAuthClient(
            appId: "${appId}",
            appSecret: "${appSecret}",
            apiUrl: "${apiBase}"
        );

        Console.WriteLine("Authenticating with Null-Auth Guard...");

        ${
          isLicenseMode
            ? `// Authenticate client license key
        Console.Write("Enter your License Key: ");
        string licenseKey = Console.ReadLine()?.Trim();

        var result = await auth.AuthenticateLicenseAsync(licenseKey);`
            : `// Authenticate machine hardware ID (HWID)
        var result = await auth.AuthenticateHwidAsync();`
        }

        if (result.Success)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[+] Access Granted! Welcome, {result.ClientName ?? "User"}");
            Console.WriteLine($"[+] Days Remaining: {result.RemainingDays} days");
            Console.WriteLine($"[+] Assigned IP: {result.Ip}");
            Console.ResetColor();

            // Proceed to launch main application logic
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"[-] Authentication Failed: {result.Message} ({result.ErrorCode})");
            Console.ResetColor();
            Environment.Exit(1);
        }
    }
}`;

  // C++ (Windows Native WinINet / libcurl style)
  const cppSnippet = `// -------------------------------------------------------------
// Null-Auth C++ Integration (${app.name})
// -------------------------------------------------------------
#include <iostream>
#include <string>
#include <windows.h>
#include <wininet.h>
#pragma comment(lib, "wininet.lib")

// HTTP POST request to Null-Auth verification endpoint
bool AuthenticateWithNullAuth()
{
    const std::string host = "${typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com'}";
    const std::string path = "${isLicenseMode ? '/api/client/auth/license' : '/api/client/auth/hwid'}";
    
    // Request Payload
    std::string jsonPayload = 
        "{"
        "\\"appId\\": \\"${appId}\\","
        "\\"appSecret\\": \\"${appSecret}\\","
        ${
          isLicenseMode
            ? `"\\"licenseKey\\": \\"PASTE_LICENSE_KEY_HERE\\","
        "\\"hwid\\": \\"MACHINE_SID_OR_HWID\\""`
            : `"\\"hwid\\": \\"MACHINE_SID_OR_HWID\\""`
        }
        "}";

    HINTERNET hInternet = InternetOpenA("NullAuthGuard/1.0", INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
    if (!hInternet) return false;

    HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), INTERNET_DEFAULT_HTTPS_PORT, NULL, NULL, INTERNET_SERVICE_HTTP, 0, 0);
    if (!hConnect) { InternetCloseHandle(hInternet); return false; }

    HINTERNET hRequest = HttpOpenRequestA(hConnect, "POST", path.c_str(), NULL, NULL, NULL, INTERNET_FLAG_SECURE | INTERNET_FLAG_RELOAD, 0);
    if (!hRequest) { InternetCloseHandle(hConnect); InternetCloseHandle(hInternet); return false; }

    std::string headers = "Content-Type: application/json\\r\\n";
    BOOL sent = HttpSendRequestA(hRequest, headers.c_str(), headers.length(), (LPVOID)jsonPayload.c_str(), jsonPayload.length());

    // Check response status...
    InternetCloseHandle(hRequest);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hInternet);

    return (sent == TRUE);
}`;

  // Python Snippet
  const pythonSnippet = `# -------------------------------------------------------------
# Null-Auth Python Integration (${app.name})
# -------------------------------------------------------------
import requests
import platform
import hashlib

API_URL = "${endpoint}"
APP_ID = "${appId}"
APP_SECRET = "${appSecret}"

def get_hwid():
    # Generate unique machine signature
    unique_string = platform.node() + platform.machine() + platform.processor()
    return hashlib.sha256(unique_string.encode('utf-8')).hexdigest()

def authenticate():
    hwid = get_hwid()
    
    payload = {
        "appId": APP_ID,
        "appSecret": APP_SECRET,
        "hwid": hwid,
        ${isLicenseMode ? '"licenseKey": input("Enter License Key: ").strip(),' : ''}
        "clientVersion": "${app.version || '1.0.0'}"
    }

    try:
        response = requests.post(API_URL, json=payload, timeout=10)
        data = response.json()

        if response.status_code == 200 and data.get("success"):
            user = data.get("data", {})
            print(f"[+] Access Granted! Welcome, {user.get('client_name', 'Client')}")
            print(f"[+] Days Left: {user.get('remaining_days')} days")
            print(f"[+] Detected IP: {user.get('ip')}")
            return True
        else:
            print(f"[-] Access Denied: {data.get('message', 'Authentication failed')}")
            return False
    except Exception as e:
        print(f"[!] Connection Error: {e}")
        return False

if __name__ == "__main__":
    if authenticate():
        print("[*] Starting protected software...")
    else:
        exit(1)`;

  // Node.js Snippet
  const nodeSnippet = `// -------------------------------------------------------------
// Null-Auth Node.js / TypeScript Integration (${app.name})
// -------------------------------------------------------------
async function authenticateNullAuth() {
  const payload = {
    appId: "${appId}",
    appSecret: "${appSecret}",
    hwid: "MACHINE_HWID_OR_UUID",
    ${isLicenseMode ? 'licenseKey: "YOUR_USER_LICENSE_KEY",' : ''}
    clientVersion: "${app.version || '1.0.0'}",
  };

  const response = await fetch("${endpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log("Authentication successful:", result.data);
    return result.data;
  } else {
    throw new Error(result.message || "Failed to authenticate with Null-Auth");
  }
}

authenticateNullAuth().catch(console.error);`;

  // cURL Snippet
  const curlSnippet = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "appId": "${appId}",
    "appSecret": "${appSecret}",
    ${isLicenseMode ? '"licenseKey": "PASTE_KEY_HERE",' : ''}
    "hwid": "USER_MACHINE_HWID",
    "clientVersion": "${app.version || '1.0.0'}"
  }'`;

  const snippets: Record<LangTab, string> = {
    csharp: csharpSnippet,
    cpp: cppSnippet,
    python: pythonSnippet,
    nodejs: nodeSnippet,
    curl: curlSnippet,
  };

  const currentSnippet = snippets[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: LangTab; label: string; icon: any }[] = [
    { id: 'csharp', label: 'C# (.NET)', icon: Cpu },
    { id: 'cpp', label: 'C++ (Windows)', icon: FileCode2 },
    { id: 'python', label: 'Python', icon: Code },
    { id: 'nodejs', label: 'Node.js', icon: Sparkles },
    { id: 'curl', label: 'cURL / REST', icon: Terminal },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Developer SDK Integration" size="xl">
      <div className="space-y-4">
        {/* App Context Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800/80 rounded-[8px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-none">{app.name}</h4>
              <span className="text-[11px] text-zinc-400 font-mono">App ID: {appId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-[5px] uppercase tracking-wider ${
                isLicenseMode
                  ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                  : 'bg-purple-950/80 text-purple-400 border border-purple-800/50'
              }`}
            >
              {isLicenseMode ? 'License Key Mode' : 'HWID Whitelist Mode'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5px] bg-zinc-900 border border-zinc-800 text-zinc-300">
              v{app.version || '1.0.0'}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800/80 rounded-[8px] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-[8px] bg-zinc-950 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Ready-to-Paste Boilerplate
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2.5 text-xs gap-1.5 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>

          <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[380px] leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
            <code>{currentSnippet}</code>
          </pre>
        </div>

        {/* Security Alert Note */}
        <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-[8px] flex items-center gap-2 text-xs text-amber-300/90">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Security Notice:</strong> Keep your Secret API Key confidential. Obfuscate or virtualize client binaries (e.g., using ConfuserEx or VMProtect) before public distribution.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
