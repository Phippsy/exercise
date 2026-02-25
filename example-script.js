/**
 * Google Apps Script — Feedback Dashboard Backend
 * =================================================
 * Deploy this as a Web App (Execute as: Me, Access: Anyone) to provide
 * a free serverless API for storing votes and annotations.
 *
 * SETUP:
 * 1. Create a Google Sheet with two tabs: "Votes" and "Annotations"
 * 2. Open Extensions → Apps Script
 * 3. Paste this code and click Deploy → New deployment → Web app
 * 4. Set "Execute as" = Me, "Who has access" = Anyone
 * 5. Copy the Web App URL into bm-feedback-review/config.js
 *
 * Votes tab columns:   timestamp | voter_name | feature_id | priority
 * Annotations tab columns: timestamp | author_name | category | item_index | note
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  // Always ensure headers exist (handles sheets created manually without them)
  const expectedHeaders = {
    Votes: ["timestamp", "voter_name", "feature_id", "priority"],
    Annotations: ["timestamp", "author_name", "category", "item_index", "note"],
    Speakers: ["timestamp", "feature_index", "speaker_name"],
  };
  const headers = expectedHeaders[name];
  if (headers) {
    const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (firstRow[0] !== headers[0]) {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function doGet(e) {
  const action = e.parameter.action;

  // Handle writes via GET (workaround for Apps Script redirect issue with POST)
  if (action === "submit_votes") {
    try {
      const data = JSON.parse(e.parameter.payload || "{}");
      data.action = action;
      return submitVotes(data);
    } catch (err) {
      return jsonResponse({ error: "Parse error: " + err.message });
    }
  } else if (action === "add_annotation") {
    try {
      const data = JSON.parse(e.parameter.payload || "{}");
      data.action = action;
      return addAnnotation(data);
    } catch (err) {
      return jsonResponse({ error: "Parse error: " + err.message });
    }
  } else if (action === "delete_annotation") {
    try {
      const data = JSON.parse(e.parameter.payload || "{}");
      return deleteAnnotation(data);
    } catch (err) {
      return jsonResponse({ error: "Parse error: " + err.message });
    }
  } else if (action === "update_annotation") {
    try {
      const data = JSON.parse(e.parameter.payload || "{}");
      return updateAnnotation(data);
    } catch (err) {
      return jsonResponse({ error: "Parse error: " + err.message });
    }
  } else if (action === "get_votes") {
    return getVotes();
  } else if (action === "get_annotations") {
    return getAnnotations();
  } else if (action === "update_speaker") {
    try {
      const data = JSON.parse(e.parameter.payload || "{}");
      return updateSpeaker(data);
    } catch (err) {
      return jsonResponse({ error: "Parse error: " + err.message });
    }
  } else if (action === "get_speakers") {
    return getSpeakers();
  } else if (action === "ping") {
    return jsonResponse({ ok: true, message: "Connected" });
  }

  return jsonResponse({ error: "Unknown action" });
}

function doPost(e) {
  try {
    // Handle different content types — postData may come as .contents or .getDataAsString()
    let raw = "";
    if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e.postData && typeof e.postData.getDataAsString === "function") {
      raw = e.postData.getDataAsString();
    } else if (e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    }

    if (!raw) return jsonResponse({ error: "No body received" });

    const data = JSON.parse(raw);
    const action = data.action;

    if (action === "submit_votes") {
      return submitVotes(data);
    } else if (action === "add_annotation") {
      return addAnnotation(data);
    }

    return jsonResponse({ error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ error: "doPost error: " + err.message });
  }
}

// --- Votes ---

function submitVotes(data) {
  const sheet = getSheet("Votes");
  const voterName = (data.voter_name || "").trim();
  if (!voterName) return jsonResponse({ error: "voter_name required" });

  const votes = data.votes || []; // [{feature_id, priority}]
  const timestamp = new Date().toISOString();

  // Remove existing votes for this voter (so re-submission overwrites)
  const allData = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][1] === voterName) {
      rowsToDelete.push(i + 1); // 1-indexed
    }
  }
  // Delete from bottom up to preserve indices
  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }

  // Write new votes
  for (const vote of votes) {
    sheet.appendRow([timestamp, voterName, vote.feature_id, vote.priority]);
  }

  return jsonResponse({
    ok: true,
    voter_name: voterName,
    votes_saved: votes.length,
  });
}

function getVotes() {
  const sheet = getSheet("Votes");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
  return jsonResponse({ votes: rows });
}

// --- Annotations ---

function addAnnotation(data) {
  const sheet = getSheet("Annotations");
  const authorName = (data.author_name || "").trim();
  if (!authorName) return jsonResponse({ error: "author_name required" });

  const timestamp = new Date().toISOString();
  sheet.appendRow([
    timestamp,
    authorName,
    data.category || "",
    data.item_index ?? "",
    data.note || "",
  ]);

  return jsonResponse({ ok: true, author_name: authorName });
}

function getAnnotations() {
  const sheet = getSheet("Annotations");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    obj._row = idx + 2; // 1-indexed sheet row (after header)
    return obj;
  });
  return jsonResponse({ annotations: rows });
}

function deleteAnnotation(data) {
  const sheet = getSheet("Annotations");
  const targetRow = data.row;
  const targetAuthor = (data.author_name || "").trim();

  if (!targetRow || targetRow < 2)
    return jsonResponse({ error: "Invalid row" });

  // Verify the author matches before deleting
  const rowData = sheet.getRange(targetRow, 1, 1, 5).getValues()[0];
  const rowAuthor = String(rowData[1]).trim();

  if (rowAuthor !== targetAuthor) {
    return jsonResponse({
      error: "Author mismatch — can only delete your own notes",
    });
  }

  sheet.deleteRow(targetRow);
  return jsonResponse({ ok: true });
}

function updateAnnotation(data) {
  const sheet = getSheet("Annotations");
  const targetRow = data.row;
  const targetAuthor = (data.author_name || "").trim();
  const newNote = data.note || "";

  if (!targetRow || targetRow < 2)
    return jsonResponse({ error: "Invalid row" });

  const rowData = sheet.getRange(targetRow, 1, 1, 5).getValues()[0];
  const rowAuthor = String(rowData[1]).trim();

  if (rowAuthor !== targetAuthor) {
    return jsonResponse({
      error: "Author mismatch — can only edit your own notes",
    });
  }

  // Update the note (column 5) and refresh timestamp (column 1)
  sheet.getRange(targetRow, 5).setValue(newNote);
  sheet.getRange(targetRow, 1).setValue(new Date().toISOString());

  return jsonResponse({ ok: true });
}

// --- Speakers ---

function updateSpeaker(data) {
  const sheet = getSheet("Speakers");
  const featureIndex = data.feature_index;
  const speakerName = (data.speaker_name || "").trim();

  if (featureIndex === undefined || !speakerName) {
    return jsonResponse({ error: "feature_index and speaker_name required" });
  }

  const timestamp = new Date().toISOString();

  // Check if there's already a row for this feature_index and update it
  const allData = sheet.getDataRange().getValues();
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][1]) === String(featureIndex)) {
      sheet.getRange(i + 1, 1).setValue(timestamp);
      sheet.getRange(i + 1, 3).setValue(speakerName);
      return jsonResponse({
        ok: true,
        feature_index: featureIndex,
        speaker_name: speakerName,
      });
    }
  }

  // No existing row — append new one
  sheet.appendRow([timestamp, featureIndex, speakerName]);
  return jsonResponse({
    ok: true,
    feature_index: featureIndex,
    speaker_name: speakerName,
  });
}

function getSpeakers() {
  const sheet = getSheet("Speakers");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
  return jsonResponse({ speakers: rows });
}

// --- Helpers ---

function jsonResponse(obj, code) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
