/**
 * AmraniAds — Google Sheets Lead Recorder
 *
 * SETUP (one-time, 3 minutes):
 * 1. Open Google Sheets → create a new spreadsheet
 * 2. Click Extensions → Apps Script
 * 3. Delete the default code, paste this entire file
 * 4. Click Save (floppy icon)
 * 5. Click Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Click Deploy → copy the web app URL
 * 7. Paste that URL into index.html where it says REPLACE_SHEETS_URL
 */

function doPost(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Leads') || ss.getActiveSheet();

  // Write header row on first run
  if (sheet.getLastRow() === 0) {
    const headers = ['التاريخ والوقت', 'الاسم', 'رقم الواتساب', 'الخدمة المطلوبة'];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold')
               .setBackground('#075E54')
               .setFontColor('#ffffff')
               .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }

  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name      || '',
    data.phone     || '',
    data.service   || ''
  ]);

  // Auto-resize columns for readability
  sheet.autoResizeColumns(1, 4);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET handler — for testing the endpoint is alive
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'AmraniAds Sheets endpoint active ✓' }))
    .setMimeType(ContentService.MimeType.JSON);
}
