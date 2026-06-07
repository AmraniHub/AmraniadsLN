// ════════════════════════════════════════════════════════════════
// AmraniAds — Rental Car Client Google Sheet Script  v2.0
// ════════════════════════════════════════════════════════════════
// INSTALL:
// 1. Open client's Google Sheet → Extensions → Apps Script
// 2. Paste this file, save (Ctrl+S)
// 3. Run setupSheet() once
// 4. Deploy → Web App → Execute as Me → Anyone
// 5. Copy URL → dashboard config + Vercel env RENTALCARS_SCRIPT_URL
// ════════════════════════════════════════════════════════════════

const LEADS_TAB = 'Leads';
const FLEET_TAB = 'Flotte';

// ── Helpers ──────────────────────────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function maTime() {
  return new Date().toLocaleString('fr-MA', { timeZone: 'Africa/Casablanca' });
}

function genRef(sheet) {
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  const seq = lastRow > 1 ? lastRow : 1;
  return 'RC-' + year + '-' + String(seq).padStart(4, '0');
}

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

function createTab(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(color)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, headers.length, 150);
  return sheet;
}

// ── Setup (run once) ──────────────────────────────────────────────
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createTab(ss, LEADS_TAB, [
    'Référence', 'Date', 'Nom', 'Téléphone', 'Voiture demandée',
    'Dates location', 'Source', 'Statut', 'Acompte', 'Montant acompte (DH)',
    'Revenue (DH)', 'Notes', 'Event ID'
  ], '#1d4ed8');

  createTab(ss, FLEET_TAB, [
    'ID', 'Marque / Modèle', 'Immatriculation', 'Année',
    'Statut', 'Client actuel', 'Retour prévu', 'Notes', 'Mis à jour'
  ], '#0891b2');

  Logger.log('✅ Sheet configurée. Déployez en Web App et copiez l\'URL.');
}

// ── POST handler ──────────────────────────────────────────────────
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    // ── New lead ────────────────────────────────────────────────
    if (action === 'lead') {
      const sheet = ss.getSheetByName(LEADS_TAB);
      const ref   = genRef(sheet);
      sheet.appendRow([
        ref,
        maTime(),
        data.name     || '',
        data.phone    || '',
        data.carType  || '',
        data.dates    || '',
        data.source   || 'Meta Ads',
        'Nouveau',
        '',   // Acompte
        '',   // Montant acompte
        '',   // Revenue
        '',   // Notes
        data.eventId  || ''
      ]);
      const sheetRow = sheet.getLastRow();
      sendTelegramAlert(data, ref);
      pingN8nAgent({ ...data, sheetRow, ref });
      return json({ status: 'ok', ref });
    }

    // ── Update lead ─────────────────────────────────────────────
    if (action === 'lead_update') {
      const sheet = ss.getSheetByName(LEADS_TAB);
      const row   = Number(data.row);
      if (row > 1) {
        if (data.status)     sheet.getRange(row, 8).setValue(data.status);
        if (data.deposit)    sheet.getRange(row, 9).setValue(data.deposit);
        if (data.depositAmt !== undefined && data.depositAmt !== '')
                             sheet.getRange(row, 10).setValue(Number(data.depositAmt)||0);
        if (data.revenue !== undefined && data.revenue !== '')
                             sheet.getRange(row, 11).setValue(Number(data.revenue)||0);
        if (data.notes)      sheet.getRange(row, 12).setValue(data.notes);

        // Color row by status
        const colors = {
          'Nouveau':       '#eff6ff',
          'Contacté':      '#fffbeb',
          'Devis envoyé':  '#f5f3ff',
          'Confirmé':      '#f0fdf4',
          'Annulé':        '#fff1f2',
          'Pas intéressé': '#f9fafb',
        };
        const col = colors[data.status] || '#ffffff';
        sheet.getRange(row, 1, 1, 13).setBackground(col);
      }
      return json({ status: 'ok' });
    }

    // ── Fleet update ─────────────────────────────────────────────
    if (action === 'fleet_update') {
      const sheet = ss.getSheetByName(FLEET_TAB);
      const rows  = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.carId)) {
          sheet.getRange(i+1, 5).setValue(data.status || '');
          sheet.getRange(i+1, 6).setValue(data.currentClient || '');
          sheet.getRange(i+1, 7).setValue(data.returnDate || '');
          sheet.getRange(i+1, 9).setValue(maTime());
          // Color by status
          const fc = { 'Disponible':'#f0fdf4', 'Loué':'#fff1f2', 'Maintenance':'#fffbeb' };
          sheet.getRange(i+1, 1, 1, 9).setBackground(fc[data.status]||'#fff');
          break;
        }
      }
      return json({ status: 'ok' });
    }

    // ── Add car ──────────────────────────────────────────────────
    if (action === 'fleet_add') {
      const sheet  = ss.getSheetByName(FLEET_TAB);
      const lastId = sheet.getLastRow() > 1
        ? sheet.getRange(sheet.getLastRow(), 1).getValue() : 0;
      sheet.appendRow([
        Number(lastId) + 1,
        data.model || '',
        data.plate || '',
        data.year  || '',
        'Disponible',
        '', '', '',
        maTime()
      ]);
      return json({ status: 'ok' });
    }

    return json({ status: 'unknown_action' });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

// ── GET handler ───────────────────────────────────────────────────
function doGet(e) {
  const tab = (e.parameter.tab || 'leads').toLowerCase();
  const ss  = SpreadsheetApp.getActiveSpreadsheet();

  if (tab === 'leads') {
    return json(sheetToJson(ss.getSheetByName(LEADS_TAB)));
  }

  if (tab === 'fleet') {
    return json(sheetToJson(ss.getSheetByName(FLEET_TAB)));
  }

  if (tab === 'stats') {
    return json(buildStats(ss));
  }

  if (tab === 'analytics') {
    return json(buildAnalytics(ss));
  }

  return json({ error: 'Unknown tab: ' + tab });
}

// ── Stats ─────────────────────────────────────────────────────────
function buildStats(ss) {
  const leads = ss.getSheetByName(LEADS_TAB).getDataRange().getValues().slice(1);
  const fleet = ss.getSheetByName(FLEET_TAB).getDataRange().getValues().slice(1);
  const total     = leads.length;
  const confirmed = leads.filter(r => r[7] === 'Confirmé').length;
  const cancelled = leads.filter(r => r[7] === 'Annulé').length;
  const contacted = leads.filter(r => ['Contacté','Devis envoyé'].includes(r[7])).length;
  const available   = fleet.filter(r => r[4] === 'Disponible').length;
  const rented      = fleet.filter(r => r[4] === 'Loué').length;
  const maintenance = fleet.filter(r => r[4] === 'Maintenance').length;
  const revenue = leads.filter(r => r[7] === 'Confirmé' && r[10])
                       .reduce((s, r) => s + Number(r[10]||0), 0);
  return {
    leads: { total, confirmed, cancelled, contacted, nouveau: total - confirmed - cancelled - contacted },
    fleet: { total: fleet.length, available, rented, maintenance },
    revenue,
    conversion: total > 0 ? Math.round(confirmed / total * 100) : 0
  };
}

// ── Analytics ─────────────────────────────────────────────────────
function buildAnalytics(ss) {
  const leads = ss.getSheetByName(LEADS_TAB).getDataRange().getValues().slice(1);

  // Monthly revenue for last 6 months
  const monthlyMap = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    monthlyMap[key] = { leads: 0, confirmed: 0, revenue: 0 };
  }
  leads.forEach(r => {
    const d = new Date(r[1]); if (isNaN(d)) return;
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    if (!monthlyMap[key]) return;
    monthlyMap[key].leads++;
    if (r[7] === 'Confirmé') {
      monthlyMap[key].confirmed++;
      monthlyMap[key].revenue += Number(r[10]||0);
    }
  });

  // Car demand
  const carMap = {};
  leads.forEach(r => {
    const car = String(r[4]||'Non précisé').trim();
    if (!carMap[car]) carMap[car] = { count: 0, revenue: 0 };
    carMap[car].count++;
    if (r[7] === 'Confirmé') carMap[car].revenue += Number(r[10]||0);
  });
  const topCars = Object.entries(carMap)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue }));

  // Status funnel
  const funnel = { 'Nouveau':0,'Contacté':0,'Devis envoyé':0,'Confirmé':0,'Annulé':0 };
  leads.forEach(r => { const s = r[7]||'Nouveau'; if (funnel[s]!==undefined) funnel[s]++; });

  return {
    monthly: Object.entries(monthlyMap).map(([k,v]) => ({ month: k, ...v })),
    topCars,
    funnel,
    total: leads.length,
  };
}

// ── Notifications ─────────────────────────────────────────────────
function sendTelegramAlert(data, ref) {
  const token  = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  const chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  const msg = [
    '🚗 <b>Nouveau lead location</b>',
    '',
    '🔖 Réf: <b>' + (ref||'—') + '</b>',
    '👤 ' + (data.name||'—'),
    '📱 ' + (data.phone||'—'),
    '🚘 ' + (data.carType||'Non précisé'),
    '📅 ' + (data.dates||'Non précisé'),
    '📍 Source: ' + (data.source||'Meta Ads'),
  ].join('\n');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
  });
}

function pingN8nAgent(data) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('N8N_WEBHOOK_URL');
  if (!webhookUrl) return;
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    });
  } catch(e) { Logger.log('n8n error: ' + e.message); }
}

// ── Script Properties setup (run once after deploy) ───────────────
function setProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'TELEGRAM_TOKEN':   'YOUR_BOT_TOKEN_HERE',
    'TELEGRAM_CHAT_ID': 'YOUR_CHAT_ID_HERE',
    'N8N_WEBHOOK_URL':  ''
  });
  Logger.log('✅ Propriétés sauvegardées');
}
