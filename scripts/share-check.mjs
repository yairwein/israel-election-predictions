// Share flow check: og tags, share URLs, images, public page privacy. node scripts/share-check.mjs http://localhost:3000 outdir
import { chromium, devices } from 'playwright';
import { writeFileSync } from 'node:fs';
const [base, out] = [process.argv[2], process.argv[3]];
const fails = [];

const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const page = await ctx.newPage();
await page.goto(base + '/predict', { waitUntil: 'networkidle' });
await page.getByPlaceholder('התחברות כמצביע בדיקה (שם)').fill(`share-${Date.now()}`);
await page.locator('.devbar button[type=submit]').click();
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: 'להתחיל מממוצע הסקרים' }).click();
await page.locator('.actionbar .btn').click();
await page.waitForSelector('#share');
await page.locator('#share img').evaluate((img) => img.decode());
await page.locator('#share').screenshot({ path: `${out}/share-card.png` });

const xHref = await page.locator('#share a[aria-label="שיתוף ב-X"]').getAttribute('href');
const fbHref = await page.locator('#share a[aria-label="שיתוף בפייסבוק"]').getAttribute('href');
const xu = new URL(xHref), fu = new URL(fbHref);
if (xu.origin + xu.pathname !== 'https://twitter.com/intent/tweet') fails.push(`X href ${xHref}`);
const sharedUrl = xu.searchParams.get('url');
if (!/\/p\/[A-Za-z0-9_-]+\?v=\d+$/.test(sharedUrl ?? '')) fails.push(`X url param ${sharedUrl}`);
if (!xu.searchParams.get('text')?.includes('גוש נתניהו')) fails.push('X text missing blocs');
if (fu.origin + fu.pathname !== 'https://www.facebook.com/sharer/sharer.php' || fu.searchParams.get('u') !== sharedUrl) fails.push(`FB href ${fbHref}`);

// public page + og tags, signed out
const anon = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const ap = await anon.newPage();
const path = new URL(sharedUrl).pathname + new URL(sharedUrl).search;
await ap.goto(base + path, { waitUntil: 'networkidle' });
const meta = await ap.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map((m) => [m.getAttribute('property') || m.getAttribute('name'), m.getAttribute('content')])));
for (const k of ['og:title', 'og:image', 'og:url', 'twitter:card', 'og:image:width']) if (!meta[k]) fails.push(`missing ${k}`);
if (meta['twitter:card'] !== 'summary_large_image') fails.push('twitter:card');
if (!meta['og:image']?.startsWith('http')) fails.push(`og:image not absolute: ${meta['og:image']}`);
const html = await ap.content();
if (/@dev\.local|@localhost|@gmail|"email"/.test(html)) fails.push('email leaked on public page');
await ap.screenshot({ path: `${out}/public-page.png`, fullPage: true });

const img = await fetch(meta['og:image']);
const buf = Buffer.from(await img.arrayBuffer());
if (img.headers.get('content-type') !== 'image/png' || buf.length < 10000) fails.push(`og image ${img.status} ${buf.length}`);
writeFileSync(`${out}/og-prediction.png`, buf);
const avg = await fetch(base + '/og/average');
writeFileSync(`${out}/og-average.png`, Buffer.from(await avg.arrayBuffer()));
const home = await (await fetch(base + '/')).text();
if (!home.includes('/og/average')) fails.push('home og:image');
if (!home.includes('https://x.com/yairwein') || !home.includes('github.com/yairwein/israel-election-predictions')) fails.push('footer links');
const nf = await fetch(base + '/p/doesnotexist1');
if (nf.status !== 404) fails.push(`unknown prediction → ${nf.status}`);
await b.close();
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : `share-check ok · ${sharedUrl}`);
