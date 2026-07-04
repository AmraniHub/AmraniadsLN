const crypto = require('crypto');

const sha256 = (v) =>
  v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined;

const normalizePhone = (phone) => {
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) p = '212' + p.slice(1);
  else if (!p.startsWith('212') && p.length === 9) p = '212' + p;
  return p;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const {
    name,
    phone,
    service,
    city,
    destination,
    tripDate,
    seats,
    price,
    type,
    notes,
    eventId,
    pixelId: clientPixelId,
    userAgent,
    eventSourceUrl,
    fbp,
    fbc,
  } = req.body || {};
  const results = {};

  // ── 1. Meta CAPI ──────────────────────────────────────
  // Use clientPixelId directly — it comes from our own trusted pages.
  // Look up a specific token per pixel; fall back to the default token
  // so CAPI always fires even if a pixel-specific token isn't configured.
  const pixelId = clientPixelId || process.env.META_PIXEL_ID;
  const tokenMap = {};
  if (process.env.META_PIXEL_ID)              tokenMap[process.env.META_PIXEL_ID]              = process.env.META_ACCESS_TOKEN;
  if (process.env.META_PIXEL_ID_SHEHRAZADE)   tokenMap[process.env.META_PIXEL_ID_SHEHRAZADE]   = process.env.META_ACCESS_TOKEN_SHEHRAZADE;
  if (process.env.META_PIXEL_ID_EN)           tokenMap[process.env.META_PIXEL_ID_EN]           = process.env.META_ACCESS_TOKEN_EN;
  if (process.env.META_PIXEL_ID_CLINIC)       tokenMap[process.env.META_PIXEL_ID_CLINIC]       = process.env.META_ACCESS_TOKEN_CLINIC;
  if (process.env.META_PIXEL_ID_AR)           tokenMap[process.env.META_PIXEL_ID_AR]           = process.env.META_ACCESS_TOKEN_AR;
  if (process.env.META_PIXEL_ID_SHOPIFY)      tokenMap[process.env.META_PIXEL_ID_SHOPIFY]      = process.env.META_ACCESS_TOKEN_SHOPIFY;
  const accessToken = (pixelId && tokenMap[pixelId]) || process.env.META_ACCESS_TOKEN;

  // Fire Meta CAPI non-blocking (don't await) so Telegram always fires fast
  if (pixelId && accessToken) {
    const parts    = String(name || '').trim().split(/\s+/);
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const testCode = process.env.META_TEST_EVENT_CODE;

    const payload = {
      data: [{
        event_name:       'Lead',
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         eventId,
        event_source_url: eventSourceUrl,
        action_source:    'website',
        user_data: {
          ph: [sha256(normalizePhone(phone))].filter(Boolean),
          fn: [sha256(parts[0])].filter(Boolean),
          ln: parts[1] ? [sha256(parts[1])] : [],
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          client_ip_address: clientIp  || undefined,
          client_user_agent: userAgent || undefined,
        },
        custom_data: { content_name: service, currency: 'MAD', value: 500 }
      }]
    };
    if (testCode) payload.test_event_code = testCode;

    try {
      const capiRes = await fetch(
        `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      results.capi = await capiRes.json();
    } catch (e) { results.capi = { error: e.message }; }

  }

  // ── 2. Telegram notification ──────────────────────────
  const srcUrl = String(eventSourceUrl || '');
  const source = srcUrl.includes('shehrazade')         ? '👑 Maison Beauty Shehrazade'
               : srcUrl.includes('/rihlaSprinter')     ? '🚌 Rihla Sprinter'
               : srcUrl.includes('/clinic')            ? '🏥 Clinic'
               : srcUrl.includes('/salon')             ? '💅 Salon'
               : srcUrl.includes('/novatech')          ? '🖥️ NovaTech'
               : srcUrl.includes('/rentalcars')        ? '🚗 Location Voiture'
               : srcUrl.includes('/location-voiture')  ? '🚗 Location Voiture'
               : srcUrl.includes('/dhb')               ? '💍 ماكينات الذهب والفضة'
               : srcUrl.includes('/en')                ? '🇬🇧 English Page'
               : srcUrl.includes('/shopify-fr')        ? '🛍️🇫🇷 Shopify FR Landing'
               : srcUrl.includes('/shopify')           ? '🛍️ Shopify Landing'
               : srcUrl.includes('/ar')                ? '🛍️ Shopify Landing'
               : '🌍 Main Website (Foreign)';

  const now = new Date().toLocaleString('fr-MA', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const isRihla      = srcUrl.includes('/rihlaSprinter');
  const isShehrazade = srcUrl.includes('shehrazade');

  const msg = isRihla
    ? `🚌 <b>طلب جديد — Rihla Sprinter</b>\n\n` +
      `👤 الاسم: ${name || '—'}\n` +
      `📱 الواتساب: <code>${phone || '—'}</code>\n` +
      `📍 المدينة: ${city || '—'}\n` +
      `🗺️ الوجهة: ${destination || '—'}\n` +
      `📅 التاريخ: ${tripDate || '—'}\n` +
      `🪑 البلايص: ${seats || '—'}\n` +
      `💰 الثمن/شخص: ${price ? price + ' DH' : '—'}\n` +
      `🚌 النوع: ${type || '—'}\n` +
      `📝 ملاحظات: ${notes || '—'}\n` +
      `🕐 ${now}`
    : isShehrazade
    ? `👑 <b>ليد جديد — Maison Beauty Shehrazade</b>\n\n` +
      `👤 الاسم: ${name || '—'}\n` +
      `📱 الهاتف: <code>${phone || '—'}</code>\n` +
      `🎯 الخدمة: ${service || '—'}\n` +
      `🕐 ${now}`
    : `🆕 <b>طلب جديد — ${source}</b>\n\n` +
      `👤 الاسم: ${name}\n` +
      `📱 الواتساب: <code>${phone}</code>\n` +
      `🎯 الخدمة: ${service}\n` +
      `🕐 ${now}`;

  const sendTelegram = async (token, chatId) => {
    if (!token || !chatId) return;
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
      });
      return await r.json();
    } catch (e) { return { error: e.message }; }
  };

  if (isShehrazade) {
    // Send to both Shehrazade bots simultaneously
    const [r1, r2] = await Promise.all([
      sendTelegram(process.env.TELEGRAM_BOT_TOKEN_1, process.env.TELEGRAM_CHAT_ID_1),
      sendTelegram(process.env.TELEGRAM_BOT_TOKEN_2, process.env.TELEGRAM_CHAT_ID_2),
    ]);
    results.telegram = { bot1: r1, bot2: r2 };
  } else {
    results.telegram = await sendTelegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
  }

  // ── 3. CRM — route to correct Google Sheet per niche ─
  const scriptUrl = srcUrl.includes('shehrazade')      ? process.env.SHEHRAZADE_SCRIPT_URL
                  : srcUrl.includes('/rihlaSprinter')   ? process.env.RIHLA_SCRIPT_URL
                  : srcUrl.includes('/salon')           ? process.env.SALON_SCRIPT_URL
                  : srcUrl.includes('/rentalcars')      ? process.env.RENTALCARS_SCRIPT_URL
                  : process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;

  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          timestamp:   new Date().toISOString(),
          name:        name        || '',
          phone:       phone       || '',
          service:     service     || '',
          source:      source      || '',
          eventId:     eventId     || '',
          campaign:    req.body?.campaign || '',
          city:        city        || '',
          destination: destination || '',
          tripDate:    tripDate    || '',
          seats:       seats       || '',
          price:       price       || '',
          type:        type        || '',
          notes:       notes       || '',
        })
      });
      results.sheets = 'sent';
    } catch (e) { results.sheets = { error: e.message }; }
  }

  return res.status(200).json({ status: 'ok', results });
};
