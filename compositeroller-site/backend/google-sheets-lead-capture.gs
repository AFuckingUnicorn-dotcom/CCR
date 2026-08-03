/**
 * CCR Lead Capture — Google Apps Script Web App
 * ------------------------------------------------
 * Receives POSTs from the comparison-guide form (and any other form
 * you point at this endpoint) and appends each submission as a row
 * in this spreadsheet. Acts as a free, no-maintenance "backend."
 * Also emails your sales inbox the moment a new lead comes in.
 *
 * SETUP:
 * 1. Create a new Google Sheet. Name it something like "CCR Leads".
 * 2. In row 1, add these headers (exact spelling matters for readability,
 *    not for the script — the script writes by position, not by name):
 *       Timestamp | Name | Email | Company | Source | Page URL
 * 3. Go to Extensions > Apps Script.
 * 4. Delete any starter code, paste this entire file in.
 * 5. Click Deploy > New deployment.
 *    - Type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (required — the form runs in a visitor's
 *      browser, not a logged-in Google account)
 * 6. Click Deploy, authorize the permissions Google asks for.
 * 7. Copy the Web App URL it gives you (ends in /exec).
 * 8. Paste that URL into FORM_ENDPOINT in comparison-guide/index.html.
 *
 * Every time someone submits the gated form, a new row appears in
 * this sheet within a couple seconds, and NOTIFY_EMAIL gets a heads-up
 * email. No polling, no database, no cost.
 */

// Edit this if the sales inbox ever changes:
const NOTIFY_EMAIL = 'INTERNALSALES@COMPOSITEROLLER.COM';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    const name = data.name || '';
    const email = data.email || '';
    const company = data.company || '';
    const source = data.source || '';
    const pageUrl = data.pageUrl || '';

    sheet.appendRow([new Date(), name, email, company, source, pageUrl]);

    // Notify sales — wrapped separately so a mail hiccup never blocks the sheet write
    try {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'New lead: ' + name + (company ? ' (' + company + ')' : ''),
        body:
          'A new lead came in from the website.\n\n' +
          'Name: ' + name + '\n' +
          'Email: ' + email + '\n' +
          'Company: ' + company + '\n' +
          'Source: ' + source + '\n' +
          'Page: ' + pageUrl + '\n' +
          'Time: ' + new Date().toString() + '\n\n' +
          'Full list: see the "CCR Leads" Google Sheet.'
      });
    } catch (mailErr) {
      // Non-fatal — the row was already saved even if the email fails.
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: lets you sanity-check the deployment by visiting the
// /exec URL directly in a browser — should show this message rather
// than an error page.
function doGet(e) {
  return ContentService.createTextOutput('CCR lead capture endpoint is live. POST only.');
}
