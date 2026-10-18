import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as readline from 'readline';
import { exec } from 'child_process';
import { OAuth2Client } from 'google-auth-library';

const CREDENTIALS_DIR = path.resolve(__dirname, '../credentials');
const CLIENT_SECRET_FILE = path.join(CREDENTIALS_DIR, 'earth-engine-oauth-client.json');
const TOKEN_FILE = path.join(CREDENTIALS_DIR, 'earth-engine-token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/earthengine',
  'https://www.googleapis.com/auth/cloud-platform',
];

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}`;

async function run() {
  console.log('='.repeat(70));
  console.log('🌍 Google Earth Engine OAuth Authentication Setup');
  console.log('='.repeat(70));

  if (!fs.existsSync(CLIENT_SECRET_FILE)) {
    console.error(`\n❌ Client secret file not found at:\n   ${CLIENT_SECRET_FILE}`);
    console.error('\nPlease place your downloaded OAuth client JSON file at the above path.');
    process.exit(1);
  }

  let clientConfig: any;
  try {
    clientConfig = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf8'));
  } catch (err: any) {
    console.error('❌ Failed to parse client secret JSON:', err.message);
    process.exit(1);
  }

  const credentials = clientConfig.installed || clientConfig.web;
  if (!credentials || !credentials.client_id || !credentials.client_secret) {
    console.error('❌ Invalid OAuth client JSON structure. Missing client_id or client_secret.');
    process.exit(1);
  }

  const { client_id, client_secret } = credentials;
  console.log(`\n📋 Loaded Client ID: ${client_id}`);

  const oauth2Client = new OAuth2Client(client_id, client_secret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n🔗 Authorization URL:\n');
  console.log(authUrl);
  console.log('\n' + '-'.repeat(70));
  console.log('Opening your browser for consent... If it does not open automatically,');
  console.log('copy and paste the link above into your browser.');
  console.log('-'.repeat(70) + '\n');

  // Attempt to open browser automatically on macOS / Linux / Windows
  const openCommand = process.platform === 'darwin' ? `open "${authUrl}"`
    : process.platform === 'win32' ? `start "" "${authUrl}"`
    : `xdg-open "${authUrl}"`;

  exec(openCommand, () => {});

  let resolved = false;

  const saveTokenAndExit = async (code: string) => {
    if (resolved) return;
    resolved = true;

    try {
      console.log('\n🔄 Exchanging authorization code for tokens...');
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.warn('⚠️ No refresh_token returned in this response (Google returns it on first consent).');
        if (fs.existsSync(TOKEN_FILE)) {
          const old = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
          if (old.refresh_token) {
            tokens.refresh_token = old.refresh_token;
            console.log('ℹ️ Reused existing refresh_token.');
          }
        }
      }

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
      console.log(`\n✅ Earth Engine tokens successfully saved to:`);
      console.log(`   ${TOKEN_FILE}`);
      console.log('\n🎉 Earth Engine authentication complete! You can now start the backend server.');
    } catch (err: any) {
      console.error('\n❌ Token exchange failed:', err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  };

  // 1. Temporary local server to catch the OAuth redirect
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const code = parsedUrl.query.code as string | undefined;

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #062b1e; color: white;">
              <div style="text-align: center; background: rgba(255,255,255,0.08); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15);">
                <h1 style="color: #4ade80;">✅ Earth Engine Authentication Successful!</h1>
                <p>Your OAuth refresh token has been stored in <code>backend/credentials/earth-engine-token.json</code>.</p>
                <p style="color: #cbd5e1; margin-top: 20px;">You can close this tab now and return to your terminal.</p>
              </div>
            </body>
          </html>
        `);

        await saveTokenAndExit(code);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No code parameter received');
      }
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error: ${e.message}`);
    }
  });

  server.listen(PORT, () => {
    console.log(`🎧 Listening on ${REDIRECT_URI} for the authorization callback...`);
  });

  server.on('error', (err: any) => {
    console.warn(`⚠️ Could not bind to port ${PORT} (${err.message}). Falling back to manual paste.`);
  });

  // 2. Terminal fallback: Allow user to paste code or full redirect URL directly
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('👉 (Optional) Or paste the authorization code / callback URL here: ', async (input) => {
    rl.close();
    if (!input.trim() || resolved) return;

    let code = input.trim();
    if (code.includes('code=')) {
      const match = code.match(/code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
    await saveTokenAndExit(code);
  });
}

run().catch((err) => {
  console.error('Fatal error during Earth Engine auth setup:', err);
  process.exit(1);
});
