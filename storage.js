/**
 * storage.js
 * Handles saving and loading data from localStorage.
 * Also handles JSON export and import with basic validation.
 */

// Keys used to store data in localStorage
var STORAGE_KEYS = {
  records:    'fintrack:records',
  settings:   'fintrack:settings',
  categories: 'fintrack:categories'
};


// Load the records array from localStorage
// Returns an empty array if nothing is saved yet
function loadRecords() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.records);
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}


// Save the records array to localStorage
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('Could not save records:', e);
    return false;
  }
}


// Load settings object from localStorage
// Merges with defaults so missing keys are always filled in
function loadSettings() {
  var defaults = { rateRWF: 1350, rateNGN: 1580, cap: 500 };
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.settings);
    var saved = JSON.parse(raw || '{}');
    // Merge: saved values overwrite defaults
    return {
      rateRWF: saved.rateRWF || defaults.rateRWF,
      rateNGN: saved.rateNGN || defaults.rateNGN,
      cap:     saved.cap     !== undefined ? saved.cap : defaults.cap
    };
  } catch (e) {
    return defaults;
  }
}


// Save settings object to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}


// Load categories array from localStorage
// Returns the 6 default categories if none are saved
function loadCategories() {
  var defaults = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.categories);
    var saved = JSON.parse(raw || 'null');
    return saved || defaults;
  } catch (e) {
    return defaults;
  }
}


// Save categories array to localStorage
function saveCategories(categories) {
  try {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
    return true;
  } catch (e) {
    return false;
  }
}


// Build a JSON string ready for download
// Wraps records in an envelope with version and export date
function exportJSON(records) {
  var data = {
    version:    1,
    exportedAt: new Date().toISOString(),
    records:    records
  };
  return JSON.stringify(data, null, 2);
}


// Parse and validate an imported JSON string
// Returns { ok: true, records: [...] } or { ok: false, error: "reason" }
function importJSON(jsonString) {
  var parsed;

  // Step 1: parse the raw string
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return { ok: false, error: 'Invalid JSON — could not parse the file.' };
  }

  // Step 2: accept either a bare array or { records: [...] }
  var records;
  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (parsed && Array.isArray(parsed.records)) {
    records = parsed.records;
  } else {
    return { ok: false, error: 'JSON must be an array or { records: [...] }.' };
  }

  // Step 3: validate each record has the required fields
  var required = ['id', 'description', 'amount', 'category', 'date'];
  var validated = [];

  for (var i = 0; i < records.length; i++) {
    var r = records[i];

    if (typeof r !== 'object' || r === null) {
      return { ok: false, error: 'Record at index ' + i + ' is not an object.' };
    }

    for (var f = 0; f < required.length; f++) {
      if (!(required[f] in r)) {
        return { ok: false, error: 'Record at index ' + i + ' is missing "' + required[f] + '".' };
      }
    }

    if (typeof r.amount !== 'number' || isNaN(r.amount) || r.amount < 0) {
      return { ok: false, error: 'Record at index ' + i + ' has an invalid amount.' };
    }

    // Add timestamps if missing
    validated.push({
      id:          r.id,
      description: r.description,
      amount:      r.amount,
      category:    r.category,
      date:        r.date,
      notes:       r.notes || '',
      createdAt:   r.createdAt || new Date().toISOString(),
      updatedAt:   r.updatedAt || new Date().toISOString()
    });
  }

  return { ok: true, records: validated };
}
