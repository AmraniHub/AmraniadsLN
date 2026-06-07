// ─────────────────────────────────────────────────────────────
//  AmraniAds — CRM Leads Proxy
//  Called by admin/index.html (same-origin, no CORS needed)
//  Fetches all leads from the central Google Sheet and returns
//  them as JSON to the admin dashboard.
//
//  Env var required:
//    CENTRAL_SHEETS_URL — the deployed Google Apps Script URL
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).end();

  const CENTRAL_URL = process.env.CENTRAL_SHEETS_URL;

  if (!CENTRAL_URL) {
    return res.status(200).json({ configured: false, leads: [] });
  }

  try {
    const r    = await fetch(CENTRAL_URL, { signal: AbortSignal.timeout(6000) });
    const data = await r.json();
    return res.status(200).json({ configured: true, ...data });
  } catch (e) {
    return res.status(200).json({ configured: true, leads: [], error: e.message });
  }
}
