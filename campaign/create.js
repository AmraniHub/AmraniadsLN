#!/usr/bin/env node
/**
 * AmraniAds — Meta Ads Campaign Creator
 * Structure: 1 Campaign / 1 Ad Set / 3 Ads (image + 2 videos)
 * Budget : $15/day CBO
 * Target : Morocco 25-45 — Advantage+ Audience
 * Start  : Today 07:00 AM Morocco (UTC+1)
 */

const fs   = require('fs');
const path = require('path');

// Load .env / .env.local (no npm deps)
for (const f of ['.env.local', '.env']) {
  try {
    fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
      .split('\n').forEach(line => {
        const m = line.match(/^([^#\s][^=]*)=(.+)$/);
        if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
      });
  } catch {}
}

const TOKEN   = process.env.META_ACCESS_TOKEN;
const PIXEL   = process.env.META_PIXEL_ID || '1433989221062105';
const ACCOUNT = 'act_903715665970067';
const URL_LP  = 'https://amraniads.com/rentalcars/';
const API     = 'https://graph.facebook.com/v20.0';
const VAPI    = 'https://graph-video.facebook.com/v20.0';

if (!TOKEN) {
  console.error('❌  META_ACCESS_TOKEN not found — add it to .env or .env.local');
  process.exit(1);
}

// Start time: today 07:00 AM Morocco (UTC+1) = 06:00 UTC
// If already past, start 5 minutes from now
const startDate = new Date();
startDate.setUTCHours(6, 0, 0, 0);
if (startDate < new Date()) startDate.setTime(Date.now() + 5 * 60 * 1000);
const START_UNIX = Math.floor(startDate.getTime() / 1000);

const CREATIVES_DIR = path.join(__dirname, '..', 'Creatives');
const IMG = path.join(CREATIVES_DIR, 'images', 'ChatGPT Image May 28, 2026, 12_18_07 AM.jpg');
const V1  = path.join(CREATIVES_DIR, 'videos', 'Create_a_short_vertical_v.mp4');
const V2  = path.join(CREATIVES_DIR, 'videos', 'e_b_b_f_mp_.mp4');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function postForm(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(`${API}/${endpoint}`, {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const j = await r.json();
  if (j.error) throw new Error(`[${j.error.code}] ${j.error.message}`);
  return j;
}

async function getApi(endpoint, params = {}) {
  const q = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(`${API}/${endpoint}?${q}`);
  const j = await r.json();
  if (j.error) throw new Error(`[${j.error.code}] ${j.error.message}`);
  return j;
}

async function uploadFile(baseUrl, filePath, mimeType, extraFields = {}) {
  const fname = path.basename(filePath);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const form = new FormData();
      form.append('access_token', TOKEN);
      Object.entries(extraFields).forEach(([k, v]) => form.append(k, v));
      const bytes = fs.readFileSync(filePath);
      const blob  = new Blob([bytes], { type: mimeType });
      form.append(mimeType.startsWith('video') ? 'source' : fname, blob, fname);
      const r = await fetch(baseUrl, { method: 'POST', body: form });
      const j = await r.json();
      if (j.error) throw new Error(`Upload [${j.error.code}]: ${j.error.message}`);
      return j;
    } catch (e) {
      if (attempt === 3) throw e;
      process.stdout.write(` retry${attempt}...`);
      await sleep(4000);
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitVideoReady(videoId) {
  for (let i = 0; i < 36; i++) {
    const { status } = await getApi(videoId, { fields: 'status' });
    if (status?.video_status === 'ready') return;
    process.stdout.write('.');
    await sleep(10000);
  }
  throw new Error(`Video ${videoId} not ready after 6 min`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  AmraniAds — Meta Ads Campaign Creator');
  console.log('─'.repeat(52));

  // Account info + page
  const acct  = await getApi(ACCOUNT, { fields: 'name,currency' });
  const pages = await getApi('me/accounts', { fields: 'id,name', limit: '1' });
  const PAGE  = pages.data?.[0];
  if (!PAGE) throw new Error('No Facebook Page linked to this access token');

  // Budget in smallest unit ($15 → 1500 cents USD; or 15000 centimes MAD)
  const BUDGET = acct.currency === 'USD' ? 1500 : 15000;

  console.log(`💰  Account   : ${acct.name} | ${acct.currency}`);
  console.log(`📄  Page      : ${PAGE.name} (${PAGE.id})`);
  console.log(`🕖  Start     : 07:00 AM Morocco → ${new Date(START_UNIX * 1000).toISOString()}`);
  console.log(`💵  Budget    : 15 ${acct.currency}/day (CBO)\n`);

  // ── 1. Upload image ────────────────────────────────────────────────────────
  process.stdout.write('📸  Uploading image... ');
  const imgRes  = await uploadFile(`${API}/${ACCOUNT}/adimages`, IMG, 'image/jpeg');
  const imgHash = Object.values(imgRes.images)[0].hash;
  console.log(`✅  hash: ${imgHash}`);

  // ── 2. Upload videos ───────────────────────────────────────────────────────
  process.stdout.write('🎬  Uploading video 1... ');
  const { id: vid1 } = await uploadFile(`${VAPI}/${ACCOUNT}/advideos`, V1, 'video/mp4', { name: 'AmraniAds_V1' });
  console.log(`✅  ID: ${vid1}`);

  process.stdout.write('🎬  Uploading video 2... ');
  const { id: vid2 } = await uploadFile(`${VAPI}/${ACCOUNT}/advideos`, V2, 'video/mp4', { name: 'AmraniAds_V2' });
  console.log(`✅  ID: ${vid2}`);

  process.stdout.write('⏳  Waiting for videos to process');
  await Promise.all([waitVideoReady(vid1), waitVideoReady(vid2)]);
  console.log(' ✅\n');

  // ── 3. Campaign (CBO — budget lives here) ─────────────────────────────────
  process.stdout.write('📁  Creating campaign... ');
  const { id: cid } = await postForm(`${ACCOUNT}/campaigns`, {
    name:                  'AmraniAds — Lead Gen 🇲🇦',
    objective:             'OUTCOME_LEADS',
    status:                'PAUSED',
    special_ad_categories: '[]',
    buying_type:           'AUCTION',
    daily_budget:          String(BUDGET),
  });
  console.log(`✅  ${cid}`);

  // ── 4. Ad Set ──────────────────────────────────────────────────────────────
  process.stdout.write('📂  Creating ad set... ');
  const { id: asid } = await postForm(`${ACCOUNT}/adsets`, {
    name:              'Morocco — 25-45 — Broad',
    campaign_id:       cid,
    optimization_goal: 'LEAD_GENERATION',
    billing_event:     'IMPRESSIONS',
    bid_strategy:      'LOWEST_COST_WITHOUT_CAP',
    start_time:        String(START_UNIX),
    status:            'PAUSED',
    promoted_object:   JSON.stringify({ pixel_id: PIXEL, custom_event_type: 'LEAD' }),
    destination_type:  'WEBSITE',
    targeting:         JSON.stringify({
      geo_locations: { countries: ['MA'] },
      age_min:       25,
      age_max:       45,
    }),
  });
  console.log(`✅  ${asid}`);

  // ── 5. Ads ─────────────────────────────────────────────────────────────────
  const adDefs = [
    {
      adName: 'Image — 900 درهم/شهر',
      cName:  'Creative_Image_900dh',
      spec: JSON.stringify({
        page_id: PAGE.id,
        link_data: {
          image_hash: imgHash,
          link:    URL_LP,
          message: 'فلوس الإشهار كتضيع؟ نحن نتكلفو بكاملو — من تصميم الحملة حتى التتبع والتحسين.\nفقط 900 درهم/شهر — ابدأ اليوم 🚀',
          name:    '900 درهم = حملة إعلانية محترفة على Meta',
          call_to_action: { type: 'LEARN_MORE', value: { link: URL_LP } },
        },
      }),
    },
    {
      adName: 'Video 1 — وقفت تخسر فلوسك',
      cName:  'Creative_Video1_Pain',
      spec: JSON.stringify({
        page_id: PAGE.id,
        video_data: {
          video_id: vid1,
          message:  'متاجر e-commerce مغربية كتضاعف طلباتها — خليها لينا بـ 900 درهم/شهر فقط',
          title:    'وقفت تخسر فلوسك على الإعلانات؟',
          call_to_action: { type: 'LEARN_MORE', value: { link: URL_LP } },
        },
      }),
    },
    {
      adName: 'Video 2 — ضاعف مبيعاتك COD',
      cName:  'Creative_Video2_COD',
      spec: JSON.stringify({
        page_id: PAGE.id,
        video_data: {
          video_id: vid2,
          message:  'إدارة كاملة لإعلاناتك على فيسبوك وإنستغرام — نتائج حقيقية لمتجرك المغربي بـ 900 درهم/شهر',
          title:    'ضاعف مبيعاتك COD مع AmraniAds 🚀',
          call_to_action: { type: 'LEARN_MORE', value: { link: URL_LP } },
        },
      }),
    },
  ];

  for (const ad of adDefs) {
    process.stdout.write(`🎨  ${ad.adName}... `);
    const { id: crid } = await postForm(`${ACCOUNT}/adcreatives`, {
      name:              ad.cName,
      object_story_spec: ad.spec,
    });
    const { id: adid } = await postForm(`${ACCOUNT}/ads`, {
      name:     ad.adName,
      adset_id: asid,
      creative: JSON.stringify({ creative_id: crid }),
      status:   'PAUSED',
    });
    console.log(`✅  ad: ${adid}`);
  }

  console.log('\n' + '═'.repeat(52));
  console.log('✅  CAMPAIGN CREATED — status: PAUSED (review before going live)');
  console.log(`📁  Campaign ID : ${cid}`);
  console.log(`📂  Ad Set ID   : ${asid}`);
  console.log(`🕖  Scheduled   : 07:00 AM Morocco today`);
  console.log(`💰  Budget      : 15 ${acct.currency}/day CBO`);
  console.log(`🌐  Landing     : ${URL_LP}`);
  console.log('─'.repeat(52));
  console.log('👆  Activate in Meta Ads Manager when ready to spend');
  console.log('═'.repeat(52) + '\n');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
