// ═════════════════════════════════════════════════════════════
//  AmraniAds — Central CRM Google Apps Script
//  Works as a STANDALONE script (no need to open from a Sheet).
//
//  HOW TO DEPLOY:
//  1. Go to script.google.com → New project → paste this code
//  2. Run setup() once — it creates the Google Sheet automatically
//  3. Deploy → New deployment → Web app
//     Execute as: Me | Who has access: Anyone
//  4. Copy the Web App URL
//  5. In Vercel dashboard (amraniads project):
//     Settings → Environment Variables → Add:
//     Name:  CENTRAL_SHEETS_URL
//     Value: [paste the Web App URL here]
// ═════════════════════════════════════════════════════════════

var ALL_HEADERS = ['#', 'Client', 'Type', 'Nom', 'WhatsApp', 'Lien WA', 'Service', 'Date'];
var COL = { NUM:1, CLIENT:2, TYPE:3, NAME:4, PHONE:5, WALINK:6, SERVICE:7, DATE:8 };

// ── Get (or create) the spreadsheet ──────────────────────────
// Saves the spreadsheet ID in Script Properties so it persists
// across runs — works whether the script is standalone or bound.
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId  = props.getProperty('SPREADSHEET_ID');

  if (ssId) {
    try { return SpreadsheetApp.openById(ssId); } catch (e) {}
  }

  // First run — create the sheet and remember its ID
  var ss = SpreadsheetApp.create('AmraniAds — Central CRM');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

// ── Normalize Moroccan phone ──────────────────────────────────
function normalizePhone(raw) {
  var p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) p = '212' + p.slice(1);
  else if (!p.startsWith('212') && p.length === 9) p = '212' + p;
  return p;
}

// ── doPost: receive a lead ────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss   = getSpreadsheet();

    var allSheet    = ss.getSheetByName('AllLeads') || ss.insertSheet('AllLeads');
    var clientSheet = ss.getSheetByName(data.client_id);
    if (!clientSheet) {
      clientSheet = ss.insertSheet(data.client_id);
      setupClientSheet(clientSheet, data.client_name || data.client_id);
    }

    var phone   = normalizePhone(data.phone);
    var waLink  = phone ? 'https://wa.me/' + phone : '';
    var dateStr = data.timestamp || Utilities.formatDate(new Date(), 'Africa/Casablanca', 'dd/MM/yyyy HH:mm');
    var rowNum  = Math.max(allSheet.getLastRow(), 1);

    // ── AllLeads tab ──
    allSheet.appendRow([
      rowNum,
      data.client_name || data.client_id,
      data.type        || 'lead',
      data.name        || '',
      phone,
      '',
      data.service     || '',
      dateStr
    ]);
    var newRow = allSheet.getLastRow();
    if (waLink) {
      var waCell = allSheet.getRange(newRow, COL.WALINK);
      waCell.setFormula('=HYPERLINK("' + waLink + '","WhatsApp 💬")');
      waCell.setFontColor('#1b5e20').setFontWeight('bold');
    }

    // Color rows per client
    var clientColors = { solyra: '#fce4ec', carrent: '#e3f2fd', beauty: '#f3e5f5', ecom: '#e8f5e9' };
    var bgColor = clientColors[data.client_id] || '#fff9c4';
    allSheet.getRange(newRow, 1, 1, ALL_HEADERS.length).setBackground(bgColor);

    // ── Client tab ──
    var clientRowNum = Math.max(clientSheet.getLastRow(), 1);
    clientSheet.appendRow([clientRowNum, data.name || '', phone, '', data.service || '', data.type || 'lead', dateStr]);
    var clientNewRow = clientSheet.getLastRow();
    if (waLink) {
      var cWaCell = clientSheet.getRange(clientNewRow, 4);
      cWaCell.setFormula('=HYPERLINK("' + waLink + '","WhatsApp 💬")');
      cWaCell.setFontColor('#1b5e20').setFontWeight('bold');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doGet: return all leads as JSON for admin dashboard ───────
function doGet(e) {
  try {
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('AllLeads');

    if (!sheet || sheet.getLastRow() < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ leads: [], total: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var leads   = [];

    for (var i = 1; i < values.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      leads.push(row);
    }

    leads.reverse(); // newest first

    var byClient = {};
    leads.forEach(function(l) {
      var c = l['Client'] || 'unknown';
      byClient[c] = (byClient[c] || 0) + 1;
    });

    return ContentService
      .createTextOutput(JSON.stringify({ leads: leads, total: leads.length, byClient: byClient }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ leads: [], error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── setup(): run ONCE to create and format the AllLeads sheet ─
function setup() {
  var ss    = getSpreadsheet(); // creates spreadsheet if needed
  var sheet = ss.getSheetByName('AllLeads');
  if (!sheet) sheet = ss.insertSheet('AllLeads');

  sheet.clear();
  sheet.clearFormats();
  sheet.appendRow(ALL_HEADERS);

  var header = sheet.getRange(1, 1, 1, ALL_HEADERS.length);
  header.setFontWeight('bold')
        .setBackground('#1a237e')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center')
        .setFontSize(11);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(COL.NUM,     45);
  sheet.setColumnWidth(COL.CLIENT, 160);
  sheet.setColumnWidth(COL.TYPE,   100);
  sheet.setColumnWidth(COL.NAME,   180);
  sheet.setColumnWidth(COL.PHONE,  150);
  sheet.setColumnWidth(COL.WALINK, 140);
  sheet.setColumnWidth(COL.SERVICE,200);
  sheet.setColumnWidth(COL.DATE,   145);

  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId();

  SpreadsheetApp.flush();

  var ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
  var msg =
    '✅ Central CRM Ready!\n\n' +
    'Sheet created:\n' + url + '\n\n' +
    'Next step — Deploy as Web App:\n' +
    'Deploy → New deployment → Web app\n' +
    'Execute as: Me | Who has access: Anyone\n\n' +
    'Then add CENTRAL_SHEETS_URL in Vercel.';

  if (ui) {
    ui.alert(msg);
  } else {
    Logger.log(msg);
    Logger.log('📊 Sheet URL: ' + url);
  }
}

// ── Helper: format a per-client sheet ────────────────────────
function setupClientSheet(sheet, clientName) {
  var headers = ['#', 'Nom', 'WhatsApp', 'Lien WA', 'Service', 'Type', 'Date'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#37474f')
    .setFontColor('#ffffff')
    .setFontSize(11);
  sheet.setFrozenRows(1);
}
