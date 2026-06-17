module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const results = {};

  const now = new Date().toLocaleString('fr-MA', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const msg = `👑 <b>TEST — Maison Beauty Shehrazade</b>\n\n✅ البوت شغال بصح!\n🕐 ${now}`;

  const sendTelegram = async (label, token, chatId) => {
    if (!token) return { error: `${label} token missing` };
    if (!chatId) return { error: `${label} chat_id missing` };
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
      });
      const data = await r.json();
      return data.ok ? { ok: true } : { error: data.description };
    } catch (e) {
      return { error: e.message };
    }
  };

  // Test bot 1
  results.bot1 = await sendTelegram(
    'Bot1',
    process.env.TELEGRAM_BOT_TOKEN_1,
    process.env.TELEGRAM_CHAT_ID_1
  );

  // Test bot 2
  results.bot2 = await sendTelegram(
    'Bot2',
    process.env.TELEGRAM_BOT_TOKEN_2,
    process.env.TELEGRAM_CHAT_ID_2
  );

  // Test Google Sheet
  const sheetUrl = process.env.SHEHRAZADE_SCRIPT_URL;
  if (sheetUrl) {
    try {
      const r = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name: 'TEST اختبار',
          phone: '0600000000',
          service: 'اختبار تقني',
          source: 'shehrazade-salon.vercel.app',
          eventId: 'test-' + Date.now()
        })
      });
      const text = await r.text();
      results.sheets = { ok: true, response: text };
    } catch (e) {
      results.sheets = { error: e.message };
    }
  } else {
    results.sheets = { error: 'SHEHRAZADE_SCRIPT_URL not set' };
  }

  results.env_check = {
    BOT_TOKEN_1: process.env.TELEGRAM_BOT_TOKEN_1 ? '✅ set' : '❌ missing',
    CHAT_ID_1:   process.env.TELEGRAM_CHAT_ID_1   ? '✅ set' : '❌ missing',
    BOT_TOKEN_2: process.env.TELEGRAM_BOT_TOKEN_2 ? '✅ set' : '❌ missing',
    CHAT_ID_2:   process.env.TELEGRAM_CHAT_ID_2   ? '✅ set' : '❌ missing',
    SHEET_URL:   process.env.SHEHRAZADE_SCRIPT_URL ? '✅ set' : '❌ missing',
  };

  return res.status(200).json(results);
};
