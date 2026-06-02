// ─────────────────────────────────────────────────────────────
//  AmraniAds — Google Apps Script
//  Paste full content into: script.google.com → Code.gs
//  Columns: # | الاسم | رقم الواتساب | رابط واتساب | الخدمة المطلوبة | الحالة | ملاحظات | تم الاتصال؟ | التاريخ
// ─────────────────────────────────────────────────────────────

var HEADERS = ['#', 'الاسم', 'رقم الواتساب', 'رابط واتساب', 'الخدمة المطلوبة', 'الحالة', 'ملاحظات', 'تم الاتصال؟', 'التاريخ'];
var COL_NUM       = 1;
var COL_NAME      = 2;
var COL_PHONE     = 3;
var COL_WALINK    = 4;
var COL_SERVICE   = 5;
var COL_STATUS    = 6;
var COL_NOTES     = 7;
var COL_CONTACTED = 8;
var COL_DATE      = 9;

// ── Dropdowns ─────────────────────────────────────────────────
var STATUS_OPTIONS    = ['جديد', 'تم الاتصال', 'مهتم', 'غير متاح', 'مكرر', 'لم يرد'];
var CONTACTED_OPTIONS = ['نعم', 'لا'];

// ── Normalize Moroccan phone → 212XXXXXXXXX ───────────────────
function normalizePhone(raw) {
  var p = String(raw || '').replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) p = '212' + p.slice(1);
  else if (!p.startsWith('212') && p.length === 9) p = '212' + p;
  return p;
}

// ── Strip leading emoji/symbols from service name ─────────────
function cleanService(s) {
  return String(s || '').trim()
    .replace(/^[\uD800-\uDFFF]{2}[\s]*/g, '')  // surrogate pairs (emoji)
    .replace(/^[^؀-ۿa-zA-Z0-9(]+/, '') // non-Arabic/Latin prefix
    .trim();
}

// ── doPost: called by Vercel on every form submission ─────────
function doPost(e) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

  var data    = JSON.parse(e.postData.contents);
  var phone   = normalizePhone(data.phone);
  var waLink  = phone ? 'https://wa.me/' + phone : '';
  var service = cleanService(data.service);
  var rowNum  = Math.max(sheet.getLastRow(), 1); // sequential #
  var dateStr = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'dd/MM/yyyy');

  // Append row
  sheet.appendRow([
    rowNum,
    data.name || '',
    phone,
    waLink,
    service,
    'جديد',   // default status
    '',        // notes — filled manually
    'لا',      // contacted? — default لا
    dateStr    // date auto-filled DD/MM/YYYY
  ]);

  var newRow = sheet.getLastRow();

  // WhatsApp clickable link
  if (waLink) {
    var cell = sheet.getRange(newRow, COL_WALINK);
    cell.setFormula('=HYPERLINK("' + waLink + '","واتساب 💬")');
    cell.setFontColor('#075E54').setFontWeight('bold');
  }

  // Dropdown: الحالة
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(newRow, COL_STATUS).setDataValidation(statusRule);

  // Dropdown: تم الاتصال؟
  var contactRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONTACTED_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(newRow, COL_CONTACTED).setDataValidation(contactRule);

  // Alternate row shading
  if (newRow % 2 === 0) {
    sheet.getRange(newRow, 1, 1, HEADERS.length).setBackground('#f0faf4');
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doGet: health check ───────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'active' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── setup(): run ONCE to build the table structure ────────────
// Select "setup" in the dropdown → click ▶ Run
function setup() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads');
  if (!sheet) sheet = ss.insertSheet('Leads');

  sheet.clear();
  sheet.clearFormats();

  // Headers
  sheet.appendRow(HEADERS);
  var hr = sheet.getRange(1, 1, 1, HEADERS.length);
  hr.setFontWeight('bold')
    .setBackground('#075E54')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setRightToLeft(true);

  // Column widths
  sheet.setColumnWidth(COL_NUM,       45);
  sheet.setColumnWidth(COL_NAME,     180);
  sheet.setColumnWidth(COL_PHONE,    150);
  sheet.setColumnWidth(COL_WALINK,   160);
  sheet.setColumnWidth(COL_SERVICE,  220);
  sheet.setColumnWidth(COL_STATUS,   130);
  sheet.setColumnWidth(COL_NOTES,    260);
  sheet.setColumnWidth(COL_CONTACTED,110);
  sheet.setColumnWidth(COL_DATE,     120);

  // Pre-apply dropdowns to rows 2–500
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, COL_STATUS, 499, 1).setDataValidation(statusRule);

  var contactRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CONTACTED_OPTIONS, true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, COL_CONTACTED, 499, 1).setDataValidation(contactRule);

  SpreadsheetApp.getUi().alert('✅ الجدول جاهز! الآن اضغط Deploy → New Deployment');
}
