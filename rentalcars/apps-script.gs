// ════════════════════════════════════════════════════════════════
// AmraniAds — Rental Car Client Google Sheet Script
// ════════════════════════════════════════════════════════════════
// HOW TO INSTALL:
// 1. Open client's Google Sheet → Extensions → Apps Script
// 2. Paste this entire file, save (Ctrl+S)
// 3. Run setupSheet() once to create tabs + headers
// 4. Deploy → New deployment → Web App
//    Execute as: Me | Who has access: Anyone
// 5. Copy the deployment URL → paste in dashboard config + api/submit.js
// ════════════════════════════════════════════════════════════════

const LEADS_TAB  = 'Leads';
const FLEET_TAB  = 'Flotte';
const STATS_TAB  = 'Stats';

// ── Script Properties keys ────────────────────────────────────
// TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, N8N_WEBHOOK_URL

// ── Setup — run once ──────────────────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createTab(ss, LEADS_TAB, [
    'Date', 'Nom', 'Téléphone', 'Voiture demandée', 'Dates location',
    'Source', 'Statut', 'Notes', 'Event ID', 'Revenue (DH)'
  ], '#1d4ed8');

  createTab(ss, FLEET_TAB, [
    'ID', 'Marque / Modèle', 'Immatriculation', 'Année',
    'Statut', 'Client actuel', 'Retour prévu', 'Notes', 'Mis à jour'
  ], '#0891b2');

  createTab(ss, STATS_TAB, [
    'Mois', 'Total leads', 'Contactés', 'Confirmés', 'Annulés',
    'Taux conversion (%)', 'Voitures disponibles', 'Voitures louées'
  ], '#6366f1');

  SpreadsheetApp.getUi().alert('✅ Feuille configurée avec succès !');
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

    if (action === 'lead') {
      const sheet = ss.getSheetByName(LEADS_TAB);
      sheet.appendRow([
        new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' }),
        data.name     || '',
        data.phone    || '',
        data.carType  || '',
        data.dates    || '',
        data.source   || 'Meta Ads',
        'Nouveau',
        '',
        data.eventId  || '',
        ''
      ]);
      const sheetRow = sheet.getLastRow();
      sendTelegramAlert(data);
      pingN8nAgent({ ...data, sheetRow });
    }

    else if (action === 'lead_update') {
      const sheet = ss.getSheetByName(LEADS_TAB);
      const row   = Number(data.row);
      if (row > 1) {
        sheet.getRange(row, 7).setValue(data.status || '');
        if (data.notes)   sheet.getRange(row, 8).setValue(data.notes);
        if (data.revenue) sheet.getRange(row, 10).setValue(Number(data.revenue));
      }
    }

    else if (action === 'fleet_update') {
      const sheet = ss.getSheetByName(FLEET_TAB);
      const rows  = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.carId)) {
          sheet.getRange(i + 1, 5).setValue(data.status || '');
          sheet.getRange(i + 1, 6).setValue(data.currentClient || '');
          sheet.getRange(i + 1, 7).setValue(data.returnDate || '');
          sheet.getRange(i + 1, 9).setValue(new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' }));
          break;
        }
      }
    }

    else if (action === 'fleet_add') {
      const sheet = ss.getSheetByName(FLEET_TAB);
      const lastId = sheet.getLastRow() > 1
        ? sheet.getRange(sheet.getLastRow(), 1).getValue()
        : 0;
      sheet.appendRow([
        Number(lastId) + 1,
        data.model       || '',
        data.plate       || '',
        data.year        || '',
        'Disponible',
        '', '', '',
        new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' })
      ]);
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
    const sheet = ss.getSheetByName(LEADS_TAB);
    return json(sheetToJson(sheet));
  }

  if (tab === 'fleet') {
    const sheet = ss.getSheetByName(FLEET_TAB);
    return json(sheetToJson(sheet));
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
  const fleet = ss.getSheetByName(FLEET_TAB).getDataRange().getValues().slice(1);
  const total       = leads.length;
  const confirmed   = leads.filter(r => r[6] === 'Confirmé').length;
  const cancelled   = leads.filter(r => r[6] === 'Annulé').length;
  const contacted   = leads.filter(r => ['Contacté','Devis envoyé'].includes(r[6])).length;
  const available   = fleet.filter(r => r[4] === 'Disponible').length;
  const rented      = fleet.filter(r => r[4] === 'Loué').length;
  const maintenance = fleet.filter(r => r[4] === 'Maintenance').length;
  const revenue = leads.filter(r => r[6] === 'Confirmé' && r[9])
                       .reduce((s, r) => s + Number(r[9] || 0), 0);
  return {
    leads: { total, confirmed, cancelled, contacted, nouveau: total - confirmed - cancelled - contacted },
    fleet: { total: fleet.length, available, rented, maintenance },
    revenue,
    conversion: total > 0 ? Math.round(confirmed / total * 100) : 0
  };
}

function pingN8nAgent(data) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('N8N_WEBHOOK_URL');
  if (!webhookUrl) return;
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        name:     data.name     || '',
        phone:    data.phone    || '',
        carType:  data.carType  || '',
        dates:    data.dates    || '',
        source:   data.source   || 'Meta Ads',
        eventId:  data.eventId  || '',
        sheetRow: data.sheetRow || 0,
      }),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('n8n webhook error: ' + e.message);
  }
}

function sendTelegramAlert(data) {
  const token  = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  const msg = `🚗 <b>Nouveau lead location voiture</b>\n\n👤 ${data.name}\n📱 ${data.phone}\n🚘 ${data.carType || 'Non précisé'}\n📅 ${data.dates || 'Non précisé'}\n📍 Source: ${data.source || 'Meta Ads'}`;
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

// ── Script Properties setup (run once after deploy) ──────────
function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'TELEGRAM_TOKEN':   'YOUR_BOT_TOKEN_HERE',
    'TELEGRAM_CHAT_ID': 'YOUR_CHAT_ID_HERE',
    'N8N_WEBHOOK_URL':  'https://your-n8n-instance/webhook/amraniads-rc-lead'
  });
}
