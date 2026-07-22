# Cliptext Desktop App Setup Guide

## Overview
This guide covers setting up cross-platform desktop builds for Mac, Windows, and Linux using Tauri.

## Prerequisites

### For Local Development
- **Mac**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio C++ Build Tools and WebView2
- **Linux**: libwebkit2gtk, libgtk-3, libappindicator3-dev

### For Distribution
- GitHub repository with Releases enabled
- (Optional) Code signing certificates for security

## Build Scripts

### Local Development
```bash
# Run desktop app in development mode
npm run tauri:dev

# Build for your current platform
npm run tauri:build
```

### Automated Builds (GitHub Actions)
The `.github/workflows/desktop-build.yml` workflow automatically builds for all platforms when you push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will create builds for:
- Mac (Apple Silicon - aarch64)
- Mac (Intel - x86_64)  
- Windows (x86_64)
- Linux (x86_64)

## Release Process

### 1. Update Version
Update version in `package.json` and `src-tauri/tauri.conf.json`

### 2. Create GitHub Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. Wait for GitHub Actions
The workflow will build all platforms and upload artifacts

### 4. Generate Update JSON
```bash
node scripts/generate-update-json.js v1.0.0
```

### 5. Upload to GitHub Releases
- Download artifacts from GitHub Actions
- Upload all .dmg, .msi, .AppImage files to the GitHub Release
- Upload `src-tauri/latest.json` as `latest.json` to the release

### 6. Update tauri.conf.json
Replace `your-username` with your actual GitHub username in the updater endpoints.

## Configuration Files

### tauri.conf.json
- Update `publisher` field with your name/company
- Update updater endpoints with your GitHub username
- Window size and other app settings

### capabilities/default.json
- Permissions for file system, dialogs, updater, deep links
- Add/remove permissions based on your needs

## Distribution

### Direct Downloads
Users can download from your GitHub Releases page:
- Mac: `cliptext_1.0.0_aarch64.dmg` (Apple Silicon) or `cliptext_1.0.0_x64.dmg` (Intel)
- Windows: `cliptext_1.0.0_x64_en-US.msi`
- Linux: `cliptext_1.0.0_amd64.AppImage`

### Website Integration
Add download buttons to your website pointing to GitHub Releases:
```html
<a href="https://github.com/your-username/cliptext/releases/latest/download/cliptext_latest_aarch64.dmg">
  Download for Mac (Apple Silicon)
</a>
```

## Auto-Updater

The app includes auto-updater functionality:
- Checks for updates on startup
- Shows dialog when update available
- Downloads and installs automatically
- Uses GitHub Releases for update detection

## Code Signing (Optional but Recommended)

### Mac
- Join Apple Developer Program ($99/year)
- Create signing certificates
- Configure in `src-tauri/tauri.conf.json`

### Windows
- Purchase code signing certificate ($100-500/year)
- Sign the .msi installer
- Reduces security warnings for users

## Testing

### Test Mac Build Locally
```bash
npm run tauri:build
# Find .dmg in src-tauri/target/release/bundle/dmg/
```

### Test Windows Build
Use GitHub Actions or a Windows machine with the prerequisites installed.

## Troubleshooting

### Build Fails
- Ensure all prerequisites are installed
- Check Rust toolchain is up to date
- Verify Node.js version matches package.json

### Updater Not Working
- Verify `latest.json` is uploaded to GitHub Releases
- Check updater endpoints in tauri.conf.json
- Ensure version numbers match between release and config

### Code Signing Issues
- Verify certificates are properly installed
- Check certificate validity
- Ensure bundle identifier matches certificate

## Security Considerations

Without code signing:
- **Mac**: Users will see "unidentified developer" warning
- **Windows**: SmartScreen may warn users
- **Linux**: Generally no issues

Users can bypass warnings, but signing provides better user experience.

## Next Steps

1. Update `your-username` in tauri.conf.json with your GitHub username
2. Test local build: `npm run tauri:build`
3. Set up GitHub repository with Releases enabled
4. Create first release tag to test automated builds
5. Consider code signing for production use
