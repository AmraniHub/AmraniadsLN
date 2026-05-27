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

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, phone, service, eventId, userAgent, eventSourceUrl } = req.body || {};

  const pixelId     = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testCode    = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    return res.status(200).json({ status: 'skipped — set META_PIXEL_ID and META_ACCESS_TOKEN in Vercel env vars' });
  }

  const parts    = String(name || '').trim().split(/\s+/);
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

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
        client_ip_address: clientIp  || undefined,
        client_user_agent: userAgent || undefined,
      },
      custom_data: {
        content_name:     service,
        content_category: 'Lead',
        currency:         'MAD',
        value:            0,
      }
    }]
  };

  if (testCode) payload.test_event_code = testCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
