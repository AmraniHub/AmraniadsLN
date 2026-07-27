// ─────────────────────────────────────────────────────────────
//  AmraniAds — Store Build Brief intake
//  Receives the completed brief from /brief/ and pushes it to a
//  dedicated Telegram bot so build requests never get buried in
//  the incoming-lead notifications.
//
//  Env vars (set in Vercel):
//    TELEGRAM_BOT_TOKEN_BRIEF — dedicated bot token  (falls back to TELEGRAM_BOT_TOKEN)
//    TELEGRAM_CHAT_ID_BRIEF   — dedicated chat id    (falls back to TELEGRAM_CHAT_ID)
//
//  The page sends pre-grouped sections so the form can change
//  without ever touching this file.
// ─────────────────────────────────────────────────────────────

const TG_LIMIT = 3900; // Telegram hard-caps a message at 4096 chars

const esc = (v) =>
  String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { client = {}, sections = [] } = req.body || {};

  const now = new Date().toLocaleString('fr-MA', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // ── Build the message ───────────────────────────────────────
  const header =
    `🧾 <b>NEW STORE BUILD BRIEF</b>\n\n` +
    `👤 Client: <b>${esc(client.name || '—')}</b>\n` +
    (client.plan ? `📦 Plan: ${esc(client.plan)}\n` : '') +
    (client.id ? `🔖 Ref: <code>${esc(client.id)}</code>\n` : '') +
    `🕐 ${now}\n`;

  const blocks = [];
  for (const sec of Array.isArray(sections) ? sections : []) {
    const items = (sec && Array.isArray(sec.items) ? sec.items : [])
      .filter((it) => it && String(it.value || '').trim() !== '');
    if (!items.length) continue;
    blocks.push(
      `\n<b>${esc(sec.title)}</b>\n` +
      items.map((it) => `• ${esc(it.label)}: <b>${esc(it.value)}</b>`).join('\n')
    );
  }

  if (!blocks.length) blocks.push('\n<i>(no fields filled)</i>');

  // Split into Telegram-sized chunks on section boundaries
  const messages = [];
  let buf = header;
  for (const b of blocks) {
    if ((buf + b).length > TG_LIMIT) {
      messages.push(buf);
      buf = `🧾 <b>BRIEF (cont.) — ${esc(client.name || '—')}</b>\n` + b;
    } else {
      buf += b;
    }
  }
  messages.push(buf);

  // ── Send ────────────────────────────────────────────────────
  const token = process.env.TELEGRAM_BOT_TOKEN_BRIEF || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID_BRIEF || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(200).json({ ok: false, reason: 'telegram_not_configured' });
  }

  const results = [];
  for (const text of messages) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      });
      results.push((await r.json())?.ok === true);
    } catch (e) {
      results.push(false);
    }
  }

  // ── Also persist to the Sheet (kind:'brief') so /admin's dashboard can list it ──
  const scriptUrl = process.env.SHOPIFY_INTL_SCRIPT_URL;
  let sheetOk = null;
  if (scriptUrl) {
    const plainBlocks = (Array.isArray(sections) ? sections : [])
      .map((sec) => {
        const items = (sec && Array.isArray(sec.items) ? sec.items : [])
          .filter((it) => it && String(it.value || '').trim() !== '');
        if (!items.length) return '';
        return `${sec.title}\n` + items.map((it) => `  • ${it.label}: ${it.value}`).join('\n');
      })
      .filter(Boolean)
      .join('\n\n');

    try {
      const r = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          kind: 'brief',
          name: client.name || '',
          ref: client.id || '',
          plan: client.plan || '',
          brief: plainBlocks || '(no fields filled)',
        }),
        signal: AbortSignal.timeout(8000),
      });
      sheetOk = r.ok;
    } catch (e) {
      sheetOk = false;
    }
  }

  return res.status(200).json({ ok: results.every(Boolean), parts: results.length, sheet: sheetOk });
}
