# AmraniAds AI Agent — Setup Guide

## Architecture

```
New lead (Meta Ads form)
    ↓
api/submit.js (Vercel)
    ↓
rentalcars/apps-script.gs — saves to Google Sheet + pings n8n webhook
    ↓
n8n Workflow #1: Premier Contact
    → OpenAI gpt-4o-mini (generate personalized darija message)
    → Meta Cloud API (send WhatsApp template)
    → Google Sheet (mark lead as Contacté)

n8n Workflow #2: Relance 24h (runs hourly)
    → Reads Google Sheet for Contacté leads 24-72h old
    → OpenAI (generate follow-up)
    → Meta Cloud API (send relance template)
    → Google Sheet (log relance sent)
```

---

## Step 1 — Meta Cloud API Setup

1. Go to developers.facebook.com → My Apps → Create App → Business
2. Add product: WhatsApp
3. In WhatsApp > API Setup: copy **Phone Number ID** and **Access Token**
4. Create a **System User** in Meta Business Manager for a permanent token
5. Add env vars to n8n:
   - `WA_PHONE_NUMBER_ID` = your Phone Number ID
   - `WA_ACCESS_TOKEN` = your permanent access token

---

## Step 2 — Create WhatsApp Templates

In Meta Business Manager → WhatsApp → Message Templates → Create:

### Template 1: `rc_premier_contact`
- Category: UTILITY
- Language: French (fr)
- Body:
  ```
  Bonjour {{1}} ! 👋 Merci pour votre demande de location.
  
  {{2}}
  
  AmraniAds — Location Voiture 🚗
  ```
  Variables: {{1}} = prénom, {{2}} = message généré par AI

### Template 2: `rc_relance`
- Category: UTILITY
- Language: French (fr)
- Body:
  ```
  Salam {{1}} 🙂
  
  {{2}}
  
  On reste disponibles ! 🚗
  ```
  Variables: {{1}} = prénom, {{2}} = message relance AI

> Approval takes 24-48h. Test with your own number first.

---

## Step 3 — n8n Setup

### Option A: n8n Cloud (easiest, $20/month)
1. Sign up at n8n.io/cloud
2. Import `n8n/rentalcars-first-contact.json` → New Workflow → Import
3. Import `n8n/rentalcars-followup.json`
4. Set environment variables in n8n Settings → Variables:
   - `WA_PHONE_NUMBER_ID`
   - `WA_ACCESS_TOKEN`
   - `OPENAI_API_KEY`
   - `RENTALCARS_SCRIPT_URL`

### Option B: Self-hosted (VPS ~5$/month)
```bash
# On Ubuntu VPS
npm install n8n -g
n8n start --tunnel
# Access at http://your-vps-ip:5678
```

5. Copy the webhook URL from the Premier Contact workflow
6. Paste it as `N8N_WEBHOOK_URL` in Google Apps Script properties

---

## Step 4 — Update Apps Script

Run `setProperties()` in `rentalcars/apps-script.gs` with:
```js
'N8N_WEBHOOK_URL': 'https://your-n8n-instance/webhook/amraniads-rc-lead'
```

The Apps Script now calls this URL automatically when a new lead arrives.

---

## Step 5 — Test

1. Submit a test form on amraniads.com/rentalcars
2. Check Google Sheet → Leads tab → new row appears
3. Check n8n → Executions → should show success
4. Check your WhatsApp → receive the AI-generated message

---

## Android App — Connection Architecture

### Short term (0 cost, ready NOW)
The dashboards are PWAs — clients open them in Chrome on Android and click
"Add to Home Screen". Looks and works like a native app. No app store needed.

URL to share with clients:
- Salon: `https://amraniads.com/salon/dashboard`
- Location voiture: `https://amraniads.com/rentalcars/dashboard`

### Push notifications on Android
The service worker (`/sw.js`) handles Web Push. To activate:
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add public key to `sw.js`
3. Add a small Vercel function `/api/push.js` to send notifications
4. Apps Script calls `/api/push.js` instead of (or in addition to) Telegram

### Long term (native Android app)
If you want to publish on Google Play Store later:
- Use **Expo** (React Native) — JavaScript, same skills as web
- Connect to same Google Apps Script API (no backend change needed)
- Replace localStorage with `SecureStore` (same logic, different storage)
- Add FCM (Firebase Cloud Messaging) for push notifications
- Build time: ~2 weeks for basic version

Connection points (same as web dashboards):
```
GET  {SCRIPT_URL}?tab=leads    → read leads
GET  {SCRIPT_URL}?tab=fleet    → read fleet
POST {SCRIPT_URL}              → update lead/fleet
```

---

## Monthly Cost Breakdown

| Service          | Cost      |
|------------------|-----------|
| n8n Cloud        | ~$20/month (or $5 VPS self-hosted) |
| OpenAI API       | ~$3-8/month (gpt-4o-mini, ~500 leads) |
| Meta Cloud API   | FREE (first 1,000 conversations/month) |
| Vercel           | FREE |
| Google Sheets    | FREE |
| **Total**        | **$8-28/month** |

Sell this as: **+500 DH/month "Follow-up automatique IA"**
Margin: ~80%
