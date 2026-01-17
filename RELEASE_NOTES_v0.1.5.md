# Release Notes - v0.1.5

**Release Date:** January 17, 2026  
**Previous Version:** v0.0.12

---

## 🎉 Highlights

This release introduces **HTTPS support**, **scroll synchronization**, and several bug fixes to improve the overall experience of using Antigravity Phone Connect.

---

## ✨ New Features

### 🔒 HTTPS Support
- **Secure connections** with self-signed SSL certificates
- **Hybrid certificate generation**: Tries OpenSSL first (for proper IP SAN support), falls back to Node.js crypto (zero dependencies)
- **Auto-detection**: Server automatically uses HTTPS when certificates are present
- **Web UI button**: "Enable HTTPS" banner for one-click certificate generation
- **Git for Windows support**: Automatically finds OpenSSL bundled with Git

### 📜 Scroll Sync
- **Bi-directional scrolling**: When you scroll on your phone, the desktop Antigravity scrolls too
- **Virtualized content support**: Triggers snapshot reload after scrolling to capture newly rendered messages
- **Debounced**: 150ms debounce to prevent excessive requests

### 📄 New Documentation
- **SECURITY.md**: Comprehensive security guide with:
  - Browser warning bypass instructions (Chrome, Safari, Firefox, Edge)
  - Certificate verification commands
  - Security model explanation
  - OpenSSL installation guide

---

## 🐛 Bug Fixes

### Message Sending
- **Fixed**: "Error sending: Unknown" popup no longer appears when message is successfully sent
- **Fixed**: Message input now clears immediately after sending (optimistic UI)
- **Changed**: `/send` endpoint now always returns 200 OK (message usually succeeds even if CDP reports issues)

### CSS Formatting
- **Fixed**: Double-escaped newline in CSS capture that was breaking phone formatting

### IP Detection
- **Fixed**: Now prioritizes real network IPs (192.168.x.x, 10.x.x.x) over virtual adapters (172.x.x.x from WSL/Docker)
- **Fixed**: Server now displays only one URL instead of multiple confusing options

---

## 📁 Files Changed

| File | Changes |
|------|---------|
| `server.js` | +168 lines - HTTPS server, scroll sync, SSL endpoints, improved IP detection |
| `public/index.html` | +147 lines - SSL banner, scroll sync, optimistic message sending |
| `generate_ssl.js` | **NEW** - Hybrid SSL certificate generator (315 lines) |
| `SECURITY.md` | **NEW** - Security documentation (263 lines) |
| `RELEASE_NOTES.md` | **NEW** - Release notes document |
| `README.md` | Updated with HTTPS instructions and new features |
| `CODE_DOCUMENTATION.md` | Updated with new API endpoints and SSL info |
| `DESIGN_PHILOSOPHY.md` | Updated with security-first principles |
| `CONTRIBUTING.md` | Updated with HTTPS testing checklist |
| `.gitignore` | Added `certs/` directory |
| `start_ag_phone_connect.bat` | SSL detection and HTTPS URL display |
| `start_ag_phone_connect.sh` | SSL detection and HTTPS URL display |

---

## 🔌 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ssl-status` | GET | Returns HTTPS status and certificate info |
| `/generate-ssl` | POST | Generates SSL certificates via web UI |
| `/remote-scroll` | POST | Syncs phone scroll position to desktop |

---

## 🚀 How to Upgrade

1. **Pull the latest changes**:
   ```bash
   git pull origin main
   ```

2. **Generate SSL certificates** (optional but recommended):
   ```bash
   node generate_ssl.js
   ```

3. **Restart the server**:
   ```bash
   node server.js
   # Or use the launcher:
   start_ag_phone_connect.bat
   ```

4. **On your phone**: Access via `https://YOUR_IP:3000` and accept the certificate warning once.

---

## ⚠️ Breaking Changes

None. This release is fully backward compatible.

---

## 🔧 Technical Details

### HTTPS Implementation
- Uses Node.js built-in `https` module
- Certificates stored in `./certs/` (gitignored)
- Server checks for `certs/server.key` and `certs/server.cert` on startup
- WebSocket automatically upgrades to `wss://` when HTTPS is enabled

### Scroll Sync Implementation
- Uses percentage-based scrolling for cross-device consistency
- Handles Antigravity's virtualized scrolling by:
  1. Scrolling desktop to position
  2. Waiting 300ms for content to render
  3. Capturing fresh snapshot
  4. Sending to phone

### Certificate Generation
- OpenSSL method includes IP addresses in SAN (Subject Alternative Names)
- Node.js method uses pure crypto (no SANs, shows URL mismatch warning)
- Auto-detects Git for Windows OpenSSL at `C:\Program Files\Git\usr\bin\openssl.exe`

---

## 📊 Stats

- **12 files changed**
- **1,446 lines added**
- **67 lines removed**
- **Net: +1,379 lines**

---

## 🙏 Acknowledgments

Based on the original [Antigravity Shit-Chat](https://github.com/gherghett/Antigravity-Shit-Chat) by gherghett.

---

## 📝 Full Changelog

- v0.1.5 - feat: HTTPS support, scroll sync, bug fixes, SECURITY.md
- v0.1.4 - feat: add scroll sync and SSL endpoints
- v0.1.3 - docs: update documentation for HTTPS/SSL support
- v0.1.2 - feat: add local SSL certificate generation
- v0.1.1 - docs: expand API endpoint documentation
- v0.1.0 - docs: add release notes and update .gitignore
- v0.0.12 - docs: update project documentation with API details
