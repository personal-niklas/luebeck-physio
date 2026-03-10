#!/usr/bin/env node
/**
 * Fetch latest Instagram posts and download images locally.
 * Run before build: `node scripts/fetch-instagram.mjs`
 *
 * Requires INSTAGRAM_ACCESS_TOKEN in .env or environment
 * Images saved to public/images/instagram/
 * Post metadata saved to src/data/instagram.json
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMG_DIR = join(ROOT, 'public', 'images', 'instagram');
const DATA_FILE = join(ROOT, 'src', 'data', 'instagram.json');
const POST_COUNT = 3;

function getToken() {
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    return process.env.INSTAGRAM_ACCESS_TOKEN;
  }
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^INSTAGRAM_ACCESS_TOKEN=(.*)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

function writeEmptyData() {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

async function main() {
  const token = getToken();

  if (!token) {
    console.log('⚠️  INSTAGRAM_ACCESS_TOKEN not set — skipping Instagram fetch.');
    if (!existsSync(DATA_FILE)) writeEmptyData();
    else console.log('   Using existing data.');
    return;
  }

  console.log('📸 Fetching Instagram posts...');

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${POST_COUNT}&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    console.error('❌ Instagram API error:', err);
    if (existsSync(DATA_FILE)) {
      console.log('   Using cached data.');
      return;
    }
    writeEmptyData();
    return;
  }

  const { data } = await res.json();
  if (!data || data.length === 0) {
    console.log('   No posts found.');
    writeEmptyData();
    return;
  }

  mkdirSync(IMG_DIR, { recursive: true });
  const posts = [];

  for (const post of data) {
    const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
    if (!imageUrl) continue;

    const filename = `${post.id}.jpg`;
    const filepath = join(IMG_DIR, filename);

    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        writeFileSync(filepath, buffer);
        console.log(`   ✓ ${filename}`);
      }
    } catch (e) {
      console.error(`   ✗ Failed to download ${post.id}:`, e.message);
      continue;
    }

    const caption = (post.caption || '').split('\n')[0].slice(0, 120);

    posts.push({
      id: post.id,
      image: `/images/instagram/${filename}`,
      caption,
      permalink: post.permalink,
      timestamp: post.timestamp,
      type: post.media_type,
    });
  }

  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
  console.log(`✅ ${posts.length} Instagram posts saved.`);
}

main().catch(console.error);
