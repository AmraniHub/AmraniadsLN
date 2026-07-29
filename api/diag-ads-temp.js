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

    const acctInfoRes = await fetch(`https://graph.facebook.com/v20.0/act_${acct}?fields=account_status,disable_reason,balance,amount_spent&access_token=${at}`);
    const acctInfo = await acctInfoRes.json();

    const targetIds = ['120252718054040341', '120252715495030341', '120252744694610341'];
    const campInsights = {};
    const campAds = {};
    for (const cid of targetIds) {
      const r = await fetch(`https://graph.facebook.com/v20.0/${cid}/insights?fields=impressions,clicks,spend,ctr,cpc,actions,cost_per_action_type&time_range={"since":"2026-06-28","until":"2026-07-28"}&time_increment=1&access_token=${at}`);
      campInsights[cid] = await r.json();
      const ar = await fetch(`https://graph.facebook.com/v20.0/${cid}/ads?fields=name,effective_status,creative{image_url},adset{name,optimization_goal,daily_budget}&access_token=${at}`);
      campAds[cid] = await ar.json();
    }

    return res.status(200).json({
      campaignsRaw: campaigns,
      adsRaw: ads,
      activeAds: withInsights,
      acctInfo,
      campInsights,
      campAds,
    });
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
