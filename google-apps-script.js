/**
 * Google Apps Script — Workout Tracker Sync Backend
 * ===================================================
 * Deploy this as a Web App to provide a free serverless API
 * for syncing workout data from the Workout Tracker PWA.
 *
 * SETUP:
 * 1. Create a new Google Sheet (or use an existing one)
 * 2. Open Extensions → Apps Script
 * 3. Paste this entire file and click Deploy → New deployment → Web app
 * 4. Set "Execute as" = Me, "Who has access" = Anyone
 * 5. Copy the Web App URL into your Workout Tracker settings
 *
 * SHEET STRUCTURE (auto-created):
 *
 *   "Sessions" tab  — one row per exercise-session (the detailed set-by-set log)
 *     timestamp | session_id | workout_id | workout_name | exercise_name |
 *     muscle_group | date | sets_json | total_volume | pr_weight | pr_volume
 *
 *   "History" tab — one row per completed workout (the summary)
 *     timestamp | history_id | workout_id | workout_name | date |
 *     exercises_json | total_sets | total_volume | total_reps |
 *     completion_pct | headline
 *
 *   "Exercises" tab — one row per exercise in the library (reference)
 *     timestamp | name | muscle_group | default_sets | default_reps |
 *     default_weight_kg | notes | form_notes | form_video
 */

// ─── Sheet helpers ──────────────────────────────────────────────────────────

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const expectedHeaders = {
    Sessions: [
      "timestamp",
      "session_id",
      "workout_id",
      "workout_name",
      "exercise_name",
      "muscle_group",
      "date",
      "sets_json",
      "total_volume",
      "pr_weight",
      "pr_volume",
    ],
    History: [
      "timestamp",
      "history_id",
      "workout_id",
      "workout_name",
      "date",
      "exercises_json",
      "total_sets",
      "total_volume",
      "total_reps",
      "completion_pct",
      "headline",
    ],
    Exercises: [
      "timestamp",
      "name",
      "muscle_group",
      "default_sets",
      "default_reps",
      "default_weight_kg",
      "notes",
      "form_notes",
      "form_video",
    ],
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

// ─── Request routing ────────────────────────────────────────────────────────

function doGet(e) {
  const action = (e.parameter || {}).action;

  try {
    if (action === "sync_workout") {
      const data = JSON.parse(e.parameter.payload || "{}");
      return syncWorkout(data);
    } else if (action === "bulk_sync") {
      const data = JSON.parse(e.parameter.payload || "{}");
      return bulkSync(data);
    } else if (action === "get_history") {
      return getHistory();
    } else if (action === "get_sessions") {
      return getSessions();
    } else if (action === "ping") {
      return jsonResponse({ ok: true, message: "Workout Tracker connected" });
    }
  } catch (err) {
    return jsonResponse({ error: "Error: " + err.message });
  }

  return jsonResponse({ error: "Unknown action: " + action });
}

function doPost(e) {
  try {
    let raw = "";
    if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    }

    if (!raw) return jsonResponse({ error: "No body received" });

    const data = JSON.parse(raw);
    const action = data.action;

    if (action === "sync_workout") {
      return syncWorkout(data);
    } else if (action === "bulk_sync") {
      return bulkSync(data);
    }

    return jsonResponse({ error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ error: "doPost error: " + err.message });
  }
}

// ─── Sync a single completed workout ────────────────────────────────────────

function syncWorkout(data) {
  var summary = data.summary;
  var sessions = data.sessions || [];

  if (!summary || !summary.id) {
    return jsonResponse({ error: "summary with id required" });
  }

  var timestamp = new Date().toISOString();

  // ── History ──
  var historySheet = getSheet("History");
  var historyId = String(summary.id);
  var existingHistoryRow = findRowByColumn(historySheet, 2, historyId);
  var historyRow = [
    timestamp, historyId, summary.workoutId || "", summary.workoutName || "",
    summary.date || "", JSON.stringify(summary.exercises || []),
    summary.totalSets || 0, summary.totalVolume || 0, summary.totalReps || 0,
    summary.completionPct || 0, summary.headline || "",
  ];

  if (existingHistoryRow > 0) {
    historySheet.getRange(existingHistoryRow, 1, 1, historyRow.length).setValues([historyRow]);
  } else {
    historySheet.appendRow(historyRow);
  }

  // ── Sessions (batch) ──
  var sessionSheet = getSheet("Sessions");
  var existingSessionData = sessionSheet.getDataRange().getValues();
  var sessionIdMap = {};
  for (var i = 1; i < existingSessionData.length; i++) {
    sessionIdMap[String(existingSessionData[i][1])] = i + 1;
  }

  var newSessionRows = [];
  sessions.forEach(function (session) {
    var sessionId = String(session.id);
    var row = [
      timestamp, sessionId, session.workoutId || "", session.workoutName || "",
      session.exerciseName || "", session.muscleGroup || "", session.date || "",
      JSON.stringify(session.sets || []), session.totalVolume || 0,
      session.pr ? !!session.pr.weight : false,
      session.pr ? !!session.pr.volume : false,
    ];

    if (sessionIdMap[sessionId]) {
      sessionSheet.getRange(sessionIdMap[sessionId], 1, 1, row.length).setValues([row]);
    } else {
      newSessionRows.push(row);
    }
  });

  if (newSessionRows.length > 0) {
    sessionSheet
      .getRange(existingSessionData.length + 1, 1, newSessionRows.length, newSessionRows[0].length)
      .setValues(newSessionRows);
  }

  return jsonResponse({
    ok: true,
    history_id: historyId,
    sessions_written: sessions.length,
  });
}

// ─── Bulk sync — mass export all history + sessions at once ─────────────────

function bulkSync(data) {
  var historyEntries = data.history || [];
  var allSessions = data.sessions || [];
  var exercises = data.exercises || [];

  var timestamp = new Date().toISOString();
  var historyWritten = 0;
  var sessionsWritten = 0;
  var exercisesWritten = 0;

  // ── History (batch read + batch write) ──
  if (historyEntries.length > 0) {
    var historySheet = getSheet("History");
    var hData = historySheet.getDataRange().getValues();
    var hIdMap = {};
    for (var hi = 1; hi < hData.length; hi++) {
      hIdMap[String(hData[hi][1])] = hi + 1;
    }

    var newHistoryRows = [];
    historyEntries.forEach(function (summary) {
      var historyId = String(summary.id);
      var row = [
        timestamp, historyId, summary.workoutId || "", summary.workoutName || "",
        summary.date || "", JSON.stringify(summary.exercises || []),
        summary.totalSets || 0, summary.totalVolume || 0, summary.totalReps || 0,
        summary.completionPct || 0, summary.headline || "",
      ];

      if (hIdMap[historyId]) {
        historySheet.getRange(hIdMap[historyId], 1, 1, row.length).setValues([row]);
      } else {
        newHistoryRows.push(row);
      }
      historyWritten++;
    });

    if (newHistoryRows.length > 0) {
      historySheet
        .getRange(hData.length + 1, 1, newHistoryRows.length, newHistoryRows[0].length)
        .setValues(newHistoryRows);
    }
  }

  // ── Sessions (batch read + batch write) ──
  if (allSessions.length > 0) {
    var sessionSheet = getSheet("Sessions");
    var sData = sessionSheet.getDataRange().getValues();
    var sIdMap = {};
    for (var si = 1; si < sData.length; si++) {
      sIdMap[String(sData[si][1])] = si + 1;
    }

    var newSessionRows = [];
    allSessions.forEach(function (session) {
      var sessionId = String(session.id);
      var row = [
        timestamp, sessionId, session.workoutId || "", session.workoutName || "",
        session.exerciseName || "", session.muscleGroup || "", session.date || "",
        JSON.stringify(session.sets || []), session.totalVolume || 0,
        session.pr ? !!session.pr.weight : false,
        session.pr ? !!session.pr.volume : false,
      ];

      if (sIdMap[sessionId]) {
        sessionSheet.getRange(sIdMap[sessionId], 1, 1, row.length).setValues([row]);
      } else {
        newSessionRows.push(row);
      }
      sessionsWritten++;
    });

    if (newSessionRows.length > 0) {
      sessionSheet
        .getRange(sData.length + 1, 1, newSessionRows.length, newSessionRows[0].length)
        .setValues(newSessionRows);
    }
  }

  // ── Exercise Library (batch read + batch write) ──
  if (exercises.length > 0) {
    var exerciseSheet = getSheet("Exercises");
    var eData = exerciseSheet.getDataRange().getValues();
    var eNameMap = {};
    for (var ei = 1; ei < eData.length; ei++) {
      eNameMap[String(eData[ei][1])] = ei + 1;
    }

    var newExerciseRows = [];
    exercises.forEach(function (ex) {
      var row = [
        timestamp, ex.name || "", ex.muscle_group || "",
        ex.sets || "", ex.reps || "", ex.weight_kg || "",
        ex.notes || "", ex.form_notes || "", ex.form_video || "",
      ];

      if (eNameMap[ex.name]) {
        exerciseSheet.getRange(eNameMap[ex.name], 1, 1, row.length).setValues([row]);
      } else {
        newExerciseRows.push(row);
      }
      exercisesWritten++;
    });

    if (newExerciseRows.length > 0) {
      exerciseSheet
        .getRange(eData.length + 1, 1, newExerciseRows.length, newExerciseRows[0].length)
        .setValues(newExerciseRows);
    }
  }

  return jsonResponse({
    ok: true,
    history_written: historyWritten,
    sessions_written: sessionsWritten,
    exercises_written: exercisesWritten,
  });
}

// ─── Read helpers ───────────────────────────────────────────────────────────

function getHistory() {
  const sheet = getSheet("History");
  return jsonResponse({ history: sheetToObjects(sheet) });
}

function getSessions() {
  const sheet = getSheet("Sessions");
  return jsonResponse({ sessions: sheetToObjects(sheet) });
}

// ─── Utility functions ──────────────────────────────────────────────────────

/**
 * Find a row where the given column matches a value. Returns row number
 * (1-indexed) or -1 if not found. Skips header row.
 */
function findRowByColumn(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]) === String(value)) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}

/**
 * Convert an entire sheet (with header row) into an array of objects.
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
