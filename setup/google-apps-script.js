// ─────────────────────────────────────────────────────────────
//  AmraniAds — Google Apps Script
//  Paste this into: script.google.com → your project → Code.gs
//  Columns: # | الاسم | رقم الواتساب | رابط واتساب | الخدمة المطلوبة | الحالة | ملاحظات | تم الاتصال؟ | التاريخ
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

  // ── Create headers on first run ──────────────────────────
  if (sheet.getLastRow() === 0) {
    const headers = [
      '#',
      'الاسم',
      'رقم الواتساب',
      'رابط واتساب',
      'الخدمة المطلوبة',
      'الحالة',
      'ملاحظات',
      'تم الاتصال؟',
      'التاريخ'
    ];
    sheet.appendRow(headers);

    const hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold')
      .setBackground('#075E54')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center')
      .setFontFamily('Cairo');

    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);

    // Column widths
    sheet.setColumnWidth(1, 45);   // #
    sheet.setColumnWidth(2, 180);  // الاسم
    sheet.setColumnWidth(3, 150);  // رقم الواتساب
    sheet.setColumnWidth(4, 220);  // رابط واتساب
    sheet.setColumnWidth(5, 220);  // الخدمة المطلوبة
    sheet.setColumnWidth(6, 130);  // الحالة
    sheet.setColumnWidth(7, 250);  // ملاحظات
    sheet.setColumnWidth(8, 110);  // تم الاتصال؟
    sheet.setColumnWidth(9, 120);  // التاريخ
  }

  // ── Parse incoming data ───────────────────────────────────
  const data = JSON.parse(e.postData.contents);

  // Normalize phone → 212XXXXXXXXX
  let phone = String(data.phone || '').replace(/\D/g, '');
  if (phone.startsWith('0') && phone.length === 10) phone = '212' + phone.slice(1);
  else if (!phone.startsWith('212') && phone.length === 9) phone = '212' + phone;

  const waLink = phone ? 'https://wa.me/' + phone : '';

  // Clean service name (strip any stray emoji prefix like "🎯 ")
  const service = String(data.service || '').trim().replace(/^[^؀-ۿa-zA-Z0-9(]+/, '');

  // Row number = data rows so far
  const rowNum = Math.max(sheet.getLastRow(), 1);

  // ── Append row ────────────────────────────────────────────
  sheet.appendRow([
    rowNum,           // #
    data.name  || '', // الاسم
    phone,            // رقم الواتساب
    waLink,           // placeholder — replaced with hyperlink below
    service,          // الخدمة المطلوبة
    '',               // الحالة         — filled manually
    '',               // ملاحظات        — filled manually
    '',               // تم الاتصال؟   — filled manually
    ''                // التاريخ        — filled manually when contacted
  ]);

  // ── Make WhatsApp link clickable ──────────────────────────
  if (waLink) {
    const newRow = sheet.getLastRow();
    const waCell = sheet.getRange(newRow, 4);
    waCell.setFormula('=HYPERLINK("' + waLink + '","واتساب 💬")');
    waCell.setFontColor('#075E54').setFontWeight('bold');
  }

  // Alternate row shading for readability
  const newRow = sheet.getLastRow();
  if (newRow % 2 === 0) {
    sheet.getRange(newRow, 1, 1, 9).setBackground('#f0faf4');
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'active', service: 'AmraniAds Leads Sheet' }))
    .setMimeType(ContentService.MimeType.JSON);
}
