using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace NullAuthClient
{
    /// <summary>
    /// Desktop Login Window Sample Application implementing BOTH Auth Methods:
    ///   - Method 1: License Key Authentication (Input Key + Bound SID)
    ///   - Method 2: Direct HWID Whitelist Authentication (Machine SID only)
    /// </summary>
    public class AuthLoginFormSample : Form
    {
        private const string APP_ID = "NA-48392017";                  // Replace with your App ID
        private const string APP_SECRET = "nas_YOUR_APP_SECRET_HERE"; // Replace with your App Secret
        private const string API_URL = "https://null-auth-backend.vercel.app";

        private readonly NullAuthSDK _sdk;
        private RadioButton _radioLicense;
        private RadioButton _radioHwid;
        private TextBox _txtLicenseKey;
        private TextBox _txtHwidSid;
        private Button _btnLogin;
        private Label _lblStatus;

        public AuthLoginFormSample()
        {
            _sdk = new NullAuthSDK(APP_ID, APP_SECRET, API_URL);
            InitializeUI();
        }

        private void InitializeUI()
        {
            Text = "Null-Auth Desktop Client Login";
            Size = new Size(480, 520);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            BackColor = Color.FromArgb(9, 9, 11);

            // Header Banner
            Panel headerPanel = new Panel
            {
                Size = new Size(480, 75),
                Location = new Point(0, 0),
                BackColor = Color.FromArgb(24, 24, 27)
            };

            Label lblTitle = new Label
            {
                Text = "🛡️ Null-Auth Desktop Client",
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                ForeColor = Color.FromArgb(239, 68, 68),
                Location = new Point(20, 15),
                AutoSize = true
            };

            Label fontSub = new Label
            {
                Text = "Private Licensing & Machine Authentication",
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(22, 42),
                AutoSize = true
            };

            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(fontSub);
            Controls.Add(headerPanel);

            // Auth Mode Selection
            Label lblModeHeader = new Label
            {
                Text = "SELECT AUTHENTICATION METHOD:",
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = Color.FromArgb(228, 228, 231),
                Location = new Point(25, 95),
                AutoSize = true
            };

            _radioLicense = new RadioButton
            {
                Text = "Method 1: License Key + Bound Machine SID",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(228, 228, 231),
                Location = new Point(30, 120),
                AutoSize = true,
                Checked = true
            };
            _radioLicense.CheckedChanged += (s, e) => ToggleMode();

            _radioHwid = new RadioButton
            {
                Text = "Method 2: HWID Whitelist Only (No License Key)",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(228, 228, 231),
                Location = new Point(30, 145),
                AutoSize = true
            };

            Controls.Add(lblModeHeader);
            Controls.Add(_radioLicense);
            Controls.Add(_radioHwid);

            // License Key Field
            Label lblKey = new Label
            {
                Text = "LICENSE KEY:",
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(25, 185),
                AutoSize = true
            };

            _txtLicenseKey = new TextBox
            {
                Text = "NULL-ABCD-1234-EFGH",
                Font = new Font("Consolas", 11),
                BackColor = Color.FromArgb(24, 24, 27),
                ForeColor = Color.White,
                Location = new Point(25, 205),
                Size = new Size(410, 30),
                BorderStyle = BorderStyle.FixedSingle
            };

            Controls.Add(lblKey);
            Controls.Add(_txtLicenseKey);

            // Machine SID Field
            Label lblSid = new Label
            {
                Text = "DETECTED WINDOWS USER SID:",
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = Color.FromArgb(161, 161, 170),
                Location = new Point(25, 255),
                AutoSize = true
            };

            _txtHwidSid = new TextBox
            {
                Text = NullAuthSDK.GetWindowsUserSid(),
                Font = new Font("Consolas", 9),
                BackColor = Color.FromArgb(24, 24, 27),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(25, 275),
                Size = new Size(410, 25),
                ReadOnly = true,
                BorderStyle = BorderStyle.FixedSingle
            };

            Controls.Add(lblSid);
            Controls.Add(_txtHwidSid);

            // Login Button
            _btnLogin = new Button
            {
                Text = "AUTHENTICATE APPLICATION",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                BackColor = Color.FromArgb(239, 68, 68),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Location = new Point(25, 330),
                Size = new Size(410, 42),
                Cursor = Cursors.Hand
            };
            _btnLogin.FlatAppearance.BorderSize = 0;
            _btnLogin.Click += async (s, e) => await PerformAuthAsync();

            Controls.Add(_btnLogin);

            // Status Display Label
            _lblStatus = new Label
            {
                Text = "",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.White,
                Location = new Point(25, 390),
                Size = new Size(410, 65)
            };

            Controls.Add(_lblStatus);
        }

        private void ToggleMode()
        {
            _txtLicenseKey.Enabled = _radioLicense.Checked;
        }

        private async Task PerformAuthAsync()
        {
            _lblStatus.ForeColor = Color.FromArgb(59, 130, 246);
            _lblStatus.Text = "[*] Authenticating with Null-Auth Cloud Server...";
            _btnLogin.Enabled = false;

            NullAuthResult result;
            if (_radioLicense.Checked)
            {
                string key = _txtLicenseKey.Text.Trim();
                if (string.IsNullOrEmpty(key))
                {
                    MessageBox.Show("Please enter a License Key.", "Input Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    _btnLogin.Enabled = true;
                    return;
                }
                result = await _sdk.AuthenticateLicenseAsync(key);
            }
            else
            {
                result = await _sdk.AuthenticateHwidAsync();
            }

            if (result.Success)
            {
                _lblStatus.ForeColor = Color.FromArgb(16, 185, 129);
                _lblStatus.Text = $"[+] SUCCESS! Access Granted.\n    Status: {result.Data?.Status}\n    Expires At: {result.Data?.ExpiresAt}\n    Remaining: {result.Data?.RemainingDays} Days";
                MessageBox.Show("Application successfully unlocked!", "Access Granted", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                _lblStatus.ForeColor = Color.FromArgb(239, 68, 68);
                _lblStatus.Text = $"[-] ACCESS DENIED: {result.Message}";
                MessageBox.Show($"Authentication Failed:\n{result.Message}", "Access Denied", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            _btnLogin.Enabled = true;
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new AuthLoginFormSample());
        }
    }
}
