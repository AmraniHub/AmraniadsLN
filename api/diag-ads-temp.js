// TEMPORARY diagnostic endpoint — reads Meta ad performance server-side so the
// token never has to be re-pasted in chat. Gated behind DASHBOARD_READ_TOKEN.
// Delete this file after use.
export default async function handler(req, res) {
  const { token } = req.query || {};
  if (!process.env.DASHBOARD_READ_TOKEN || token !== process.env.DASHBOARD_READ_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const acct = process.env.META_AD_ACCOUNT_2_ID;
  const at = process.env.META_AD_ACCOUNT_2_TOKEN;
  if (!acct || !at) return res.status(200).json({ error: 'missing env' });

  try {
    const campaignsRes = await fetch(`https://graph.facebook.com/v20.0/act_${acct}/campaigns?fields=name,status,effective_status,objective&limit=50&access_token=${at}`);
    const campaigns = await campaignsRes.json();

    const adsRes = await fetch(`https://graph.facebook.com/v20.0/act_${acct}/ads?fields=name,status,effective_status,creative{id,image_url},adset{name,optimization_goal}&limit=50&access_token=${at}`);
    const ads = await adsRes.json();

    let withInsights = [];
    if (Array.isArray(ads.data)) {
      const active = ads.data.filter(a => a.effective_status === 'ACTIVE');
      withInsights = await Promise.all(
        active.map(async (a) => {
          const insR = await fetch(`https://graph.facebook.com/v20.0/${a.id}/insights?fields=impressions,clicks,spend,ctr,actions,cost_per_action_type&date_preset=last_30d&access_token=${at}`);
          const ins = await insR.json();
          return { ...a, insights: (ins.data && ins.data[0]) || ins };
        })
      );
    }

    return res.status(200).json({
      campaignsRaw: campaigns,
      adsRaw: ads,
      activeAds: withInsights,
    });
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
