#!/usr/bin/env node
/**
 * Refresh Instagram long-lived access token.
 * Tokens expire after 60 days — run this every ~50 days.
 *
 * Usage: INSTAGRAM_ACCESS_TOKEN=xxx node scripts/refresh-instagram-token.mjs
 * Updates the token in .env file automatically.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_PATH = join(ROOT, '.env');

async function main() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ INSTAGRAM_ACCESS_TOKEN not set.');
    process.exit(1);
  }

  console.log('🔄 Refreshing Instagram token...');

  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    console.error('❌ Token refresh failed:', err);
    process.exit(1);
  }

  const { access_token, expires_in } = await res.json();
  const expiresInDays = Math.round(expires_in / 86400);
  console.log(`✅ New token received (expires in ${expiresInDays} days).`);

  // Update .env file
  if (existsSync(ENV_PATH)) {
    let env = readFileSync(ENV_PATH, 'utf-8');
    if (env.includes('INSTAGRAM_ACCESS_TOKEN=')) {
      env = env.replace(/INSTAGRAM_ACCESS_TOKEN=.*/, `INSTAGRAM_ACCESS_TOKEN=${access_token}`);
    } else {
      env += `\nINSTAGRAM_ACCESS_TOKEN=${access_token}\n`;
    }
    writeFileSync(ENV_PATH, env);
    console.log('   .env updated.');
  }

  // Output for GitHub Actions (can be captured as output)
  console.log(`::set-output name=token::${access_token}`);
}

main().catch(console.error);
