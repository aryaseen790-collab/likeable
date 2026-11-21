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
  const isApk = (r) => !r.draft && !r.prerelease && /^app-v\d+\.\d+\.\d+$/.test(r.tag_name) && r.assets.some((a) => a.name.endsWith('.apk'));
  const rel = releases.find(isApk);
  if (!rel) return write({}), console.log('app-release: no APK release yet; download button hidden');
  const version = rel.tag_name.slice('app-v'.length);
  const apk = rel.assets.find((a) => a.name === `likeable-person-test-${version}.apk`) ?? rel.assets.find((a) => a.name.endsWith('.apk'));
  // GitHub records each file's SHA-256 itself, so the checksum shown on the site
  // comes from GitHub, not from a file we wrote.
  const sha256 = /^sha256:([a-f0-9]{64})$/.exec(apk.digest ?? '')?.[1];
  if (!sha256) throw new Error(`no SHA-256 digest for ${apk.name}`);
  // release.json (written by the APK workflow) only adds the minimum Android version.
  let minSdk = 24; // React Native 0.88's minimum, the fallback if release.json is missing or unreadable
  const meta = rel.assets.find((a) => a.name === 'release.json');
  if (meta) {
    try {
      const info = JSON.parse(await (await fetch(meta.browser_download_url, { signal: AbortSignal.timeout(15000) })).text());
      if (Number.isInteger(info.minSdk) && info.minSdk >= 21 && info.minSdk < 100) minSdk = info.minSdk;
      if (info.sha256 && info.sha256 !== sha256) throw new Error('release.json checksum does not match the APK');
    } catch (e) {
      if (/does not match/.test(e.message)) throw e;
      console.warn(`app-release: release.json unreadable (${e.message}); assuming minSdk ${minSdk}`);
    }
  }
  write({
    version,
    url: apk.browser_download_url,
    size: apk.size,
    sha256,
    minSdk,
    published: rel.published_at,
    notes: rel.html_url,
  });
  console.log(`app-release: v${version} (${(apk.size / 1048576).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.warn(`app-release: ${e.message}; download button hidden`);
  write({});
});
