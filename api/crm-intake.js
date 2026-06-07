// ─────────────────────────────────────────────────────────────
//  AmraniAds — CRM Intake
//  Receives leads from ALL client landing pages (any domain)
//  and forwards them to the central Google Sheet.
//
//  Env var required (set once in Vercel):
//    CENTRAL_SHEETS_URL — the deployed Google Apps Script URL
//
//  Called by every client's api/submit.js as a fire-and-forget.
//  Always returns 200 — never blocks client landing pages.
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Allow cross-origin calls from any client domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const {
    client_id   = 'unknown',
    client_name = 'Unknown Client',
    type        = 'lead',
    name        = '',
    phone       = '',
    service     = '',
    timestamp   = new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' })
  } = req.body || {};

  const CENTRAL_URL = process.env.CENTRAL_SHEETS_URL;

  if (CENTRAL_URL) {
    try {
      await fetch(CENTRAL_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id, client_name, type, name, phone, service, timestamp }),
        signal:  AbortSignal.timeout(4000) // 4s max — never hangs
      });
    } catch (_) {
      // Silent fail — central sheet down = no problem for client page
    }
  }

  return res.status(200).json({ ok: true });
}
