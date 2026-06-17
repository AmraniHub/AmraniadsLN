// ─────────────────────────────────────────────────────────────
// Maison Beauty Shehrazade — Google Apps Script Webhook
// ─────────────────────────────────────────────────────────────
// HOW TO USE:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script
// 3. Delete everything and paste this entire file
// 4. Click Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the Web App URL
// 6. Add it as SHEHRAZADE_SCRIPT_URL in Vercel env vars
// ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Set headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['الاسم', 'الهاتف', 'الخدمة', 'التاريخ', 'المصدر', 'Event ID']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#c9922b').setFontColor('#ffffff');
    }

    const data = JSON.parse(e.postData.contents);

    const now = new Date().toLocaleString('fr-MA', {
      timeZone: 'Africa/Casablanca',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    sheet.appendRow([
      data.name    || '',
      data.phone   || '',
      data.service || '',
      now,
      data.source  || 'shehrazade-salon.vercel.app',
      data.eventId || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function — run this manually to verify sheet connection
function testSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow(['Test Name', '0612345678', 'Test Service', new Date().toLocaleString(), 'test', 'test-id']);
  Logger.log('Row added successfully');
}
