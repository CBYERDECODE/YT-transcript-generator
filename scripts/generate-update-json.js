#!/usr/bin/env node

/**
 * This script generates the latest.json file for Tauri auto-updater
 * It should be run after creating a GitHub release with the built artifacts
 * 
 * Usage: node scripts/generate-update-json.js <version>
 * Example: node scripts/generate-update-json.js v1.0.0
 */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Please provide a version number');
  console.error('Usage: node scripts/generate-update-json.js <version>');
  process.exit(1);
}

// Remove 'v' prefix if present
const cleanVersion = version.replace(/^v/, '');

const updateJson = {
  version: cleanVersion,
  notes: `Cliptext ${cleanVersion}\n\nBug fixes and improvements.`,
  pub_date: new Date().toISOString(),
  platforms: {
    "darwin-aarch64": {
      signature: "",
      url: `https://github.com/your-username/cliptext/releases/download/v${cleanVersion}/cliptext_${cleanVersion}_aarch64.dmg`
    },
    "darwin-x86_64": {
      signature: "",
      url: `https://github.com/your-username/cliptext/releases/download/v${cleanVersion}/cliptext_${cleanVersion}_x64.dmg`
    },
    "linux-x86_64": {
      signature: "",
      url: `https://github.com/your-username/cliptext/releases/download/v${cleanVersion}/cliptext_${cleanVersion}_amd64.AppImage`
    },
    "windows-x86_64": {
      signature: "",
      url: `https://github.com/your-username/cliptext/releases/download/v${cleanVersion}/cliptext_${cleanVersion}_x64_en-US.msi`
    }
  }
};

const outputPath = path.join(__dirname, '..', 'src-tauri', 'latest.json');
fs.writeFileSync(outputPath, JSON.stringify(updateJson, null, 2));

console.log(`Generated latest.json for version ${cleanVersion}`);
console.log(`Upload this file to GitHub Releases as latest.json`);
console.log(`Path: ${outputPath}`);
