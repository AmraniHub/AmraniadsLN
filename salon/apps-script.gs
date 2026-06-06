// ════════════════════════════════════════════════════════════════
// AmraniAds — Salon Client Google Sheet Script
// ════════════════════════════════════════════════════════════════
// HOW TO INSTALL:
// 1. Open client's Google Sheet → Extensions → Apps Script
// 2. Paste this entire file, save (Ctrl+S)
// 3. Run setupSheet() once to create tabs + headers
// 4. Run setProperties() to add your Telegram token
// 5. Deploy → New deployment → Web App
//    Execute as: Me | Who has access: Anyone
// 6. Copy the deployment URL → paste in dashboard config
//    AND add as SALON_SCRIPT_URL in Vercel env vars
// ════════════════════════════════════════════════════════════════

const LEADS_TAB    = 'Leads';
const SERVICES_TAB = 'Services';
const STATS_TAB    = 'Stats';

// ── Setup — run once ──────────────────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createTab(ss, LEADS_TAB, [
    'Date', 'Nom', 'Téléphone', 'Service demandé', 'Source',
    'Statut', 'Notes', 'Event ID', 'Revenue (DH)', 'Campagne'
  ], '#e8559a');

  createTab(ss, SERVICES_TAB, [
    'Service', 'Prix (DH)', 'Durée (min)', 'Notes'
  ], '#a78bfa');

  createTab(ss, STATS_TAB, [
    'Mois', 'Total leads', 'RDV pris', 'Terminés', 'Annulés',
    'Taux conversion (%)', 'Revenue total (DH)'
  ], '#6366f1');

  // Pre-fill services tab with typical salon services
  const sSheet = ss.getSheetByName(SERVICES_TAB);
  const services = [
    ['Coupe femme', 150, 60, ''],
    ['Coupe homme', 60, 30, ''],
    ['Couleur complète', 350, 120, ''],
    ['Mèches / Balayage', 450, 150, ''],
    ['Soin kératine', 600, 180, ''],
    ['Coiffure mariage', 800, 180, 'Sur réservation'],
    ['Brushing', 80, 45, ''],
    ['Manucure', 100, 60, ''],
    ['Pédicure', 120, 60, ''],
    ['Épilation sourcils', 30, 15, ''],
  ];
  sSheet.getRange(2, 1, services.length, 4).setValues(services);

  SpreadsheetApp.getUi().alert('✅ Feuille salon configurée avec succès !');
}

function createTab(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground(color).setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, headers.length, 160);
}

// ── POST handler ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'lead' || !action) {
      const sheet = ss.getSheetByName(LEADS_TAB);
      sheet.appendRow([
        new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' }),
        data.name     || '',
        data.phone    || '',
        data.service  || '',
        data.source   || 'Meta Ads',
        'Nouveau',
        '',
        data.eventId  || '',
        '',
        data.campaign || ''
      ]);
      sendTelegramAlert(data);
    }

    else if (action === 'lead_update') {
      const sheet = ss.getSheetByName(LEADS_TAB);
      const row   = Number(data.row);
      if (row > 1) {
        sheet.getRange(row, 6).setValue(data.status || '');
        if (data.notes)   sheet.getRange(row, 7).setValue(data.notes);
        if (data.revenue) sheet.getRange(row, 9).setValue(Number(data.revenue));
      }
    }

    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// ── GET handler ───────────────────────────────────────────────
function doGet(e) {
  const tab = (e.parameter.tab || 'leads').toLowerCase();
  const ss  = SpreadsheetApp.getActiveSpreadsheet();

  if (tab === 'leads') {
    return json(sheetToJson(ss.getSheetByName(LEADS_TAB)));
  }
  if (tab === 'services') {
    return json(sheetToJson(ss.getSheetByName(SERVICES_TAB)));
  }
  if (tab === 'stats') {
    return json(buildStats(ss));
  }
  return json({ error: 'Unknown tab' });
}

// ── Helpers ───────────────────────────────────────────────────
function sheetToJson(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { headers: data[0] || [], rows: [] };
  const headers = data[0];
  const rows = data.slice(1).map((r, i) => {
    const obj = { _row: i + 2 };
    headers.forEach((h, j) => { obj[h] = r[j]; });
    return obj;
  });
  return { headers, rows };
}

function buildStats(ss) {
  const leads = ss.getSheetByName(LEADS_TAB).getDataRange().getValues().slice(1);
  const total     = leads.length;
  const rdv       = leads.filter(r => r[5] === 'RDV pris').length;
  const termine   = leads.filter(r => r[5] === 'Terminé').length;
  const annule    = leads.filter(r => r[5] === 'Annulé').length;
  const revenue   = leads.filter(r => r[5] === 'Terminé' && r[8])
                         .reduce((s, r) => s + Number(r[8] || 0), 0);
  return {
    leads: { total, rdv, termine, annule, nouveau: total - rdv - termine - annule },
    revenue,
    conversion: total > 0 ? Math.round(termine / total * 100) : 0
  };
}

function sendTelegramAlert(data) {
  const token  = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  const msg = `💅 <b>طلب جديد — صالون</b>\n\n👤 ${data.name}\n📱 ${data.phone}\n✂️ ${data.service || 'غير محدد'}\n📍 Source: ${data.source || 'Meta Ads'}\n🎯 Campagne: ${data.campaign || '—'}`;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'TELEGRAM_TOKEN':   'YOUR_BOT_TOKEN_HERE',
    'TELEGRAM_CHAT_ID': 'YOUR_CHAT_ID_HERE'
  });
}
