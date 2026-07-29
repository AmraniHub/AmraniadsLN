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
    const [campaigns, ads] = await Promise.all([
      fetch(`https://graph.facebook.com/v20.0/act_${acct}/campaigns?fields=name,status,effective_status,objective&limit=50&access_token=${at}`).then(r => r.json()),
      fetch(`https://graph.facebook.com/v20.0/act_${acct}/ads?fields=name,status,effective_status,creative{id,image_url,object_story_spec},adset{name,optimization_goal,promoted_object}&limit=50&access_token=${at}`).then(r => r.json()),
    ]);

    const active = (ads.data || []).filter(a => a.effective_status === 'ACTIVE');
    const withInsights = await Promise.all(
      active.map(async (a) => {
        const ins = await fetch(`https://graph.facebook.com/v20.0/${a.id}/insights?fields=impressions,clicks,spend,ctr,actions,cost_per_action_type&date_preset=last_30d&access_token=${at}`).then(r => r.json());
        return { ...a, insights: ins.data && ins.data[0] };
      })
    );

    return res.status(200).json({ campaigns: campaigns.data, activeAds: withInsights });
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
