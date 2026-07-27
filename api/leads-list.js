// ─────────────────────────────────────────────────────────────
//  AmraniAds — Leads/Briefs read proxy for /admin
//  GET /api/leads-list?tab=leads|briefs&token=...
//
//  Keeps DASHBOARD_READ_TOKEN server-side only for the hop to
//  Vercel; the browser still needs to send it back to us so this
//  endpoint isn't a fully open read of your leads/briefs sheet.
//
//  Env vars:
//    SHOPIFY_INTL_SCRIPT_URL — same Apps Script used by api/submit.js
//    DASHBOARD_READ_TOKEN    — shared secret, must match the Apps Script's READ_TOKEN
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { tab, token } = req.query || {};
  const expected = process.env.DASHBOARD_READ_TOKEN;

  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (tab !== 'leads' && tab !== 'briefs') {
    return res.status(400).json({ error: 'tab must be "leads" or "briefs"' });
  }

  const scriptUrl = process.env.SHOPIFY_INTL_SCRIPT_URL;
  if (!scriptUrl) {
    return res.status(200).json({ configured: false, rows: [] });
  }

  try {
    const url = `${scriptUrl}?tab=${tab}&token=${encodeURIComponent(expected)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    return res.status(200).json({ configured: true, ...data });
  } catch (e) {
    return res.status(200).json({ configured: true, rows: [], error: e.message });
  }
}
