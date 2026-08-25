#!/usr/bin/env python3
"""
Null-Auth Desktop Login Window Sample (Python Tkinter GUI)
Demonstrates a complete Desktop Application Login Screen implementing BOTH Auth Methods:
  - Method 1: License Key Authentication
  - Method 2: Direct HWID Whitelist Authentication
"""

import tkinter as tk
from tkinter import messagebox, ttk
from null_auth_sdk import NullAuthSDK

# Configure App Credentials from Null-Auth Dashboard
APP_ID = "NA-48392017"                  # Replace with your App ID
APP_SECRET = "nas_YOUR_APP_SECRET_HERE" # Replace with your App Secret
API_URL = "https://null-auth-backend.vercel.app"

class NullAuthLoginApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Null-Auth Desktop Client Login")
        self.root.geometry("450x480")
        self.root.configure(bg="#09090b")
        self.root.resizable(False, False)

        self.sdk = NullAuthSDK(APP_ID, APP_SECRET, API_URL)
        self.detected_sid = self.sdk.get_windows_user_sid()

        self.create_widgets()

    def create_widgets(self):
        # Header Logo Banner
        header = tk.Frame(self.root, bg="#18181b", height=80)
        header.pack(fill="x")
        
        title_lbl = tk.Label(header, text="🛡️ Null-Auth Secure Client", font=("Segoe UI", 14, "bold"), fg="#ef4444", bg="#18181b")
        title_lbl.pack(pady=(15, 2))
        
        sub_lbl = tk.Label(header, text="Private Licensing & Machine Authentication", font=("Segoe UI", 9), fg="#a1a1aa", bg="#18181b")
        sub_lbl.pack()

        # Body Container
        body = tk.Frame(self.root, bg="#09090b", padx=25, pady=20)
        body.pack(fill="both", expand=True)

        # Mode Selection Radio Buttons
        self.auth_mode = tk.StringVar(value="LICENSE")

        mode_lbl = tk.Label(body, text="SELECT AUTHENTICATION METHOD:", font=("Segoe UI", 9, "bold"), fg="#e4e4e7", bg="#09090b")
        mode_lbl.pack(anchor="w", pady=(0, 8))

        radio_frame = tk.Frame(body, bg="#09090b")
        radio_frame.pack(fill="x", pady=(0, 15))

        r1 = tk.Radiobutton(radio_frame, text="Method 1: License Key + HWID", variable=self.auth_mode, value="LICENSE",
                            command=self.toggle_mode, font=("Segoe UI", 9), fg="#e4e4e7", bg="#09090b", selectcolor="#18181b", activebackground="#09090b", activeforeground="#ef4444")
        r1.pack(anchor="w")

        r2 = tk.Radiobutton(radio_frame, text="Method 2: HWID Whitelist Only", variable=self.auth_mode, value="HWID",
                            command=self.toggle_mode, font=("Segoe UI", 9), fg="#e4e4e7", bg="#09090b", selectcolor="#18181b", activebackground="#09090b", activeforeground="#ef4444")
        r2.pack(anchor="w", pady=(4, 0))

        # License Key Input Field
        self.key_lbl = tk.Label(body, text="LICENSE KEY:", font=("Segoe UI", 9, "bold"), fg="#a1a1aa", bg="#09090b")
        self.key_lbl.pack(anchor="w")

        self.key_entry = tk.Entry(body, font=("Consolas", 11), bg="#18181b", fg="#ffffff", insertbackground="#ffffff", borderwidth=1, relief="solid")
        self.key_entry.pack(fill="x", pady=(4, 15), ipady=6)
        self.key_entry.insert(0, "NULL-ABCD-1234-EFGH")

        # Detected Windows User SID Field
        sid_lbl = tk.Label(body, text="DETECTED WINDOWS MACHINE SID:", font=("Segoe UI", 9, "bold"), fg="#a1a1aa", bg="#09090b")
        sid_lbl.pack(anchor="w")

        sid_entry = tk.Entry(body, font=("Consolas", 9), bg="#18181b", fg="#10b981", borderwidth=1, relief="solid")
        sid_entry.pack(fill="x", pady=(4, 20), ipady=5)
        sid_entry.insert(0, self.detected_sid)
        sid_entry.configure(state="readonly")

        # Login Submit Button
        self.login_btn = tk.Button(body, text="AUTHENTICATE APPLICATION", font=("Segoe UI", 10, "bold"), fg="#ffffff", bg="#ef4444", activebackground="#dc2626", activeforeground="#ffffff", borderwidth=0, cursor="hand2", command=self.perform_auth)
        self.login_btn.pack(fill="x", ipady=8)

        # Status Label Output
        self.status_lbl = tk.Label(body, text="", font=("Segoe UI", 9), bg="#09090b", wraplength=380)
        self.status_lbl.pack(pady=15)

    def toggle_mode(self):
        if self.auth_mode.get() == "HWID":
            self.key_entry.configure(state="disabled")
            self.key_lbl.configure(fg="#52525b")
        else:
            self.key_entry.configure(state="normal")
            self.key_lbl.configure(fg="#a1a1aa")

    def perform_auth(self):
        mode = self.auth_mode.get()
        self.status_lbl.configure(text="[*] Contacting Null-Auth Cloud Server...", fg="#3b82f6")
        self.root.update_idletasks()

        if mode == "LICENSE":
            license_key = self.key_entry.get().strip()
            if not license_key:
                messagebox.showwarning("Input Error", "Please enter a License Key.")
                return
            result = self.sdk.authenticate_license(license_key)
        else:
            result = self.sdk.authenticate_hwid()

        if result.get("success"):
            data = result.get("data", {})
            msg = f"SUCCESS! Access Granted.\nStatus: {data.get('status')}\nExpires At: {data.get('expires_at')}\nRemaining: {data.get('remaining_days')} Days"
            self.status_lbl.configure(text=msg, fg="#10b981")
            messagebox.showinfo("Access Granted", "Application successfully unlocked!")
        else:
            reason = result.get("message", "Authentication Failed")
            self.status_lbl.configure(text=f"FAILED: {reason}", fg="#ef4444")
            messagebox.showerror("Access Denied", f"Authentication Failed:\n{reason}")

if __name__ == "__main__":
    root = tk.Tk()
    app = NullAuthLoginApp(root)
    root.mainloop()
