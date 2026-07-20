/**
 * state.js
 * The single source of truth for all app data.
 * All data lives in the "appState" object.
 * Every change goes through a function here — nothing edits state directly.
 */

// The main state object — one place for everything
var appState = {
  records:    [],
  settings:   { rateRWF: 1350, rateNGN: 1580, cap: 500 },
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],

  // UI/filter state
  sortKey:           'date',
  sortDir:           'desc',
  searchQuery:       '',
  searchCaseSensitive: false,
  searchDescOnly:    false,
  filterCategory:    null   // null means "show all"
};


// =============================================
// INIT — load saved data from localStorage
// =============================================
function initState() {
  appState.records    = loadRecords();
  appState.settings   = loadSettings();
  appState.categories = loadCategories();
}


// =============================================
// GETTERS — read from state
// =============================================
function getRecords() {
  return appState.records;
}

function getSettings() {
  return appState.settings;
}

function getCategories() {
  return appState.categories;
}

function getUIState() {
  return {
    sortKey:             appState.sortKey,
    sortDir:             appState.sortDir,
    searchQuery:         appState.searchQuery,
    searchCaseSensitive: appState.searchCaseSensitive,
    searchDescOnly:      appState.searchDescOnly,
    filterCategory:      appState.filterCategory
  };
}


// =============================================
// RECORD MUTATIONS
// =============================================

// Add a new record and save
function addRecord(record) {
  appState.records.push(record);
  saveRecords(appState.records);
}

// Update one record by id and save
function updateRecord(id, updates) {
  var index = -1;
  for (var i = 0; i < appState.records.length; i++) {
    if (appState.records[i].id === id) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    return false;
  }
  // Merge old record with new values
  var old = appState.records[index];
  appState.records[index] = {
    id:          old.id,
    description: updates.description !== undefined ? updates.description : old.description,
    amount:      updates.amount      !== undefined ? updates.amount      : old.amount,
    category:    updates.category    !== undefined ? updates.category    : old.category,
    date:        updates.date        !== undefined ? updates.date        : old.date,
    notes:       updates.notes       !== undefined ? updates.notes       : old.notes,
    createdAt:   old.createdAt,
    updatedAt:   new Date().toISOString()
  };
  saveRecords(appState.records);
  return true;
}

// Remove a record by id and save
function deleteRecord(id) {
  var newList = [];
  for (var i = 0; i < appState.records.length; i++) {
    if (appState.records[i].id !== id) {
      newList.push(appState.records[i]);
    }
  }
  appState.records = newList;
  saveRecords(appState.records);
}

// Replace all records at once (used by import and clear)
function replaceAllRecords(records) {
  appState.records = records;
  saveRecords(appState.records);
}


// =============================================
// SETTINGS MUTATIONS
// =============================================
function updateSettings(newValues) {
  if (newValues.rateRWF !== undefined) appState.settings.rateRWF = newValues.rateRWF;
  if (newValues.rateNGN !== undefined) appState.settings.rateNGN = newValues.rateNGN;
  if (newValues.cap     !== undefined) appState.settings.cap     = newValues.cap;
  saveSettings(appState.settings);
}


// =============================================
// CATEGORY MUTATIONS
// =============================================
function addCategory(name) {
  var trimmed = name.trim();
  if (!trimmed) {
    return false;
  }
  // Check for duplicate
  for (var i = 0; i < appState.categories.length; i++) {
    if (appState.categories[i] === trimmed) {
      return false;
    }
  }
  appState.categories.push(trimmed);
  saveCategories(appState.categories);
  return true;
}

function removeCategory(name) {
  var newList = [];
  for (var i = 0; i < appState.categories.length; i++) {
    if (appState.categories[i] !== name) {
      newList.push(appState.categories[i]);
    }
  }
  appState.categories = newList;
  saveCategories(appState.categories);
}


// =============================================
// UI STATE SETTERS
// =============================================
function setSort(key, dir) {
  appState.sortKey = key;
  appState.sortDir = dir;
}

function setSearch(query, caseSensitive, descOnly) {
  appState.searchQuery         = query;
  appState.searchCaseSensitive = caseSensitive;
  appState.searchDescOnly      = descOnly;
}

function setFilterCategory(cat) {
  appState.filterCategory = cat;
}


// =============================================
// COMPUTED: filter + sort records for display
// =============================================
function getFilteredSorted() {
  // Start with a copy so we don't mutate the original
  var list = appState.records.slice();

  // 1. Filter by category
  if (appState.filterCategory) {
    var filtered = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].category === appState.filterCategory) {
        filtered.push(list[i]);
      }
    }
    list = filtered;
  }

  // 2. Filter by search query
  if (appState.searchQuery.trim()) {
    var flags = appState.searchCaseSensitive ? '' : 'i';
    var regex = compileRegex(appState.searchQuery, flags);

    if (regex) {
      var searched = [];
      for (var j = 0; j < list.length; j++) {
        var r = list[j];
        var match = false;

        if (appState.searchDescOnly) {
          match = regex.test(r.description);
        } else {
          match = regex.test(r.description) ||
                  regex.test(String(r.amount)) ||
                  regex.test(r.category) ||
                  regex.test(r.date) ||
                  regex.test(r.notes || '');
        }

        if (match) {
          searched.push(r);
        }
      }
      list = searched;
    }
  }

  // 3. Sort
  list.sort(function(a, b) {
    var av, bv;

    if (appState.sortKey === 'date') {
      av = a.date;
      bv = b.date;
    } else if (appState.sortKey === 'amount') {
      av = a.amount;
      bv = b.amount;
    } else {
      av = (a.description || '').toLowerCase();
      bv = (b.description || '').toLowerCase();
    }

    if (av < bv) return appState.sortDir === 'asc' ? -1 : 1;
    if (av > bv) return appState.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
}


// =============================================
// COMPUTED: dashboard statistics
// =============================================
function getStats() {
  var records = appState.records;

  // Total and count
  var total = 0;
  for (var i = 0; i < records.length; i++) {
    total += records[i].amount;
  }
  var count = records.length;
  var avg = count > 0 ? total / count : 0;

  // Spending per category
  var catTotals = {};
  for (var j = 0; j < records.length; j++) {
    var cat = records[j].category;
    if (!catTotals[cat]) {
      catTotals[cat] = 0;
    }
    catTotals[cat] += records[j].amount;
  }

  // Find the top category
  var topCat = null;
  var topAmt = 0;
  for (var key in catTotals) {
    if (catTotals[key] > topAmt) {
      topAmt = catTotals[key];
      topCat = [key, catTotals[key]];
    }
  }

  // Build 7-day trend — one entry per day
  var trend = [];
  var now = new Date();
  for (var d = 6; d >= 0; d--) {
    var day = new Date(now);
    day.setDate(day.getDate() - d);
    var iso   = day.toISOString().slice(0, 10);
    var label = day.toLocaleDateString('en-US', { weekday: 'short' });

    var dayTotal = 0;
    for (var k = 0; k < records.length; k++) {
      if (records[k].date === iso) {
        dayTotal += records[k].amount;
      }
    }
    trend.push({ date: iso, label: label, total: dayTotal });
  }

  // Category breakdown sorted by amount
  var catBreakdown = [];
  for (var c in catTotals) {
    catBreakdown.push({ cat: c, amount: catTotals[c] });
  }
  catBreakdown.sort(function(a, b) {
    return b.amount - a.amount;
  });

  return {
    total:        total,
    count:        count,
    avg:          avg,
    topCat:       topCat,
    trend:        trend,
    catBreakdown: catBreakdown,
    catTotals:    catTotals
  };
}
