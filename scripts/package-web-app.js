#!/usr/bin/env node

/**
 * This script creates a downloadable web app package
 * It bundles the built web app with instructions for local use
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const packagePath = path.join(__dirname, '..', 'cliptext-web-app');

console.log('Building web app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

console.log('Creating web app package...');

// Create package directory
if (fs.existsSync(packagePath)) {
  fs.rmSync(packagePath, { recursive: true, force: true });
}
fs.mkdirSync(packagePath, { recursive: true });

// Copy dist files
const distFiles = fs.readdirSync(distPath);
distFiles.forEach(file => {
  const srcPath = path.join(distPath, file);
  const destPath = path.join(packagePath, file);
  if (fs.statSync(srcPath).isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Create README for local use
const readmeContent = `# Cliptext - Web App (Local Version)

## How to Run Locally

### Option 1: Simple File Open
1. Double-click on \`index.html\` to open in your browser
2. Or right-click \`index.html\` and "Open with" your preferred browser

### Option 2: Local Server (Recommended)
For better performance and API compatibility:

**Using Python:**
\`\`\`bash
python -m http.server 8000
\`\`\`
Then open http://localhost:8000 in your browser

**Using Node.js:**
\`\`\`bash
npm start
\`\`\`

**Using VS Code:**
- Install "Live Server" extension
- Right-click index.html and select "Open with Live Server"

## Features

- Generate YouTube transcripts
- Translate transcripts to multiple languages
- Offline transcript caching
- Works with videos with or without captions

## Configuration

### API Keys Required

For full functionality, you'll need to configure API keys:

1. **AssemblyAI API Key** (for videos without captions)
   - Get free key from https://www.assemblyai.com/
   - The web app will prompt you to enter this when needed

2. **Supabase Credentials** (for authentication and storage)
   - Create a free project at https://supabase.com/
   - Add your credentials in the browser when prompted

### Local API Mode

For complete offline functionality, you can:
1. Set up your own backend server using the provided API files
2. Configure the app to use your local server
3. This allows unlimited free usage without external dependencies

## Limitations

- Browser security restrictions may affect some features when running from file://
- Some APIs require HTTPS (use local server for best experience)
- Cross-origin requests may be blocked without proper server setup

## Troubleshooting

**Transcript generation fails:**
- Check your API keys are configured
- Ensure you have internet connection for API calls
- Try using a local server instead of file:// protocol

**Translation not working:**
- Translation uses free MyMemory API
- May have rate limits for heavy usage
- Works best with shorter transcripts

**Offline features not working:**
- Browser may restrict localStorage when using file://
- Use a local server for full offline functionality
- Check browser settings for local storage permissions

## Support

For issues or questions, visit: https://github.com/your-username/cliptext

## Version
${packageJson.version}
`;

fs.writeFileSync(path.join(packagePath, 'README_LOCAL.md'), readmeContent);

// Create a simple server script for users
const serverScript = `#!/usr/bin/env node
/**
 * Simple local server for Cliptext web app
 * Run: npm start
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile('./index.html', (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(\`Cliptext web app running at http://localhost:\${PORT}/\`);
  console.log('Press Ctrl+C to stop the server');
});
`;

fs.writeFileSync(path.join(packagePath, 'serve.js'), serverScript);

// Create package.json for the web app
const webPackageJson = {
  name: 'cliptext-web-app',
  version: packageJson.version,
  description: 'Cliptext web app for local use',
  type: 'module',
  scripts: {
    start: 'node serve.js'
  }
};

fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(webPackageJson, null, 2));

console.log('✓ Web app package created successfully!');
console.log(`✓ Package location: ${packagePath}`);
console.log('\nTo create a distributable zip:');
console.log('  - On Mac: Right-click folder -> Compress');
console.log('  - On Windows: Right-click folder -> Send to -> Compressed folder');
console.log('  - Or use: zip -r cliptext-web-app.zip cliptext-web-app');
