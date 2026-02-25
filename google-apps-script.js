/**
 * Google Apps Script — Workout Tracker Sync
 * ==========================================
 * Minimal backend: one "Log" sheet with one row per set.
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Extensions → Apps Script → paste this file
 * 3. Click Run on doGet, authorise the permissions prompt
 * 4. Deploy → New deployment → Web app
 *    Execute as = Me, Who has access = Anyone
 * 5. Copy the Web App URL into your Workout Tracker sync settings
 *
 * SHEET: "Log"
 *   date | workout | exercise | muscle_group | set | reps | kg
 */

function getLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Log");
  if (!sheet) {
    sheet = ss.insertSheet("Log");
  }
  var first = sheet.getRange(1, 1).getValue();
  if (first !== "date") {
    sheet.getRange(1, 1, 1, 7).setValues([
      ["date", "workout", "exercise", "muscle_group", "set", "reps", "kg"]
    ]);
  }
  return sheet;
}

function doGet(e) {
  var p = e.parameter || {};
  var action = p.action;

  try {
    if (action === "ping") {
      return json({ ok: true, message: "Workout Tracker connected" });
    }

    if (action === "log") {
      var rows = JSON.parse(p.rows || "[]");
      return appendRows(rows, false);
    }

    if (action === "clear_log") {
      var rows = JSON.parse(p.rows || "[]");
      return appendRows(rows, true);
    }

    return json({ error: "Unknown action: " + action });
  } catch (err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    var raw = (e.postData && e.postData.contents) || "";
    if (!raw) return json({ error: "No body" });
    var data = JSON.parse(raw);
    if (data.action === "log") return appendRows(data.rows || [], false);
    if (data.action === "clear_log") return appendRows(data.rows || [], true);
    return json({ error: "Unknown action" });
  } catch (err) {
    return json({ error: err.message });
  }
}

function appendRows(rows, clearFirst) {
  var sheet = getLogSheet();

  if (clearFirst) {
    var last = sheet.getLastRow();
    if (last > 1) {
      sheet.deleteRows(2, last - 1);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }

  return json({ ok: true, rows_written: rows.length });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
