// Build step: find the newest Android APK on this repo's GitHub Releases (tags
// app-v*, published by .github/workflows/android-apk.yml) and write its details to
// .cache/app-release.json for the "Get the Android app" section.
//
// Runs at build time only, so visitors' browsers never contact GitHub's API. If there
// is no release yet, or GitHub can't be reached, it writes {} and the site simply
// shows no download button; the build never fails because of it.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('.cache/app-release.json');
const REPO = process.env.APP_RELEASE_REPO || process.env.GITHUB_REPOSITORY || 'aryaseen790-collab/likeable';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'likeable-site-build' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const write = (data) => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
};

async function main() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const releases = await res.json();
  const rel = releases.find((r) => !r.draft && !r.prerelease && /^app-v\d+\.\d+\.\d+$/.test(r.tag_name) && r.assets.some((a) => a.name === 'release.json'));
  if (!rel) return write({}), console.log('app-release: no APK release yet; download button hidden');
  const meta = rel.assets.find((a) => a.name === 'release.json');
  const info = await (await fetch(meta.browser_download_url, { signal: AbortSignal.timeout(15000) })).json();
  const apk = rel.assets.find((a) => a.name === info.file);
  // Only trust values of the expected shape (this file ends up in every page).
  if (!apk || !/^\d+\.\d+\.\d+$/.test(info.version) || !/^[a-f0-9]{64}$/.test(info.sha256) || !Number.isInteger(info.minSdk)) throw new Error('release.json is malformed');
  write({
    version: info.version,
    url: apk.browser_download_url,
    size: apk.size,
    sha256: info.sha256,
    minSdk: info.minSdk,
    published: rel.published_at,
    notes: rel.html_url,
  });
  console.log(`app-release: v${info.version} (${(apk.size / 1048576).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.warn(`app-release: ${e.message}; download button hidden`);
  write({});
});
