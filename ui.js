/**
 * ui.js
 * All DOM rendering lives here.
 * Reads from state and paints the page — never touches data directly.
 */


// =============================================
// ANNOUNCE — screen reader live regions
// =============================================
// Posts a message to the hidden ARIA live region
// assertive = true means it interrupts the user (used for errors/warnings)
function announce(message, assertive) {
  var id = assertive ? 'status-assertive' : 'status-polite';
  var el = document.getElementById(id);
  if (!el) return;
  // Clear first, then set — this forces screen readers to re-read it
  el.textContent = '';
  setTimeout(function() {
    el.textContent = message;
  }, 50);
}


// =============================================
// CURRENCY FORMATTING
// =============================================
function fmtUSD(number) {
  return '$' + number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtRWF(number, rate) {
  var converted = Math.round(number * rate);
  return converted.toLocaleString() + ' RWF';
}


// =============================================
// CATEGORY HELPERS
// =============================================
// Returns the CSS class for a category chip
function catClass(category) {
  var map = {
    'food':          'cat-food',
    'books':         'cat-books',
    'transport':     'cat-transport',
    'entertainment': 'cat-entertainment',
    'fees':          'cat-fees',
    'other':         'cat-other'
  };
  var key = (category || '').toLowerCase();
  return map[key] || 'cat-other';
}

// Returns the hex color for category bars in the dashboard
var CAT_COLORS = {
  'food':          '#ea580c',
  'books':         '#7c3aed',
  'transport':     '#0284c7',
  'entertainment': '#db2777',
  'fees':          '#d97706',
  'other':         '#64748b'
};

function catColor(category) {
  var key = (category || '').toLowerCase();
  return CAT_COLORS[key] || '#64748b';
}


// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  var stats    = getStats();
  var settings = getSettings();

  // Fill the stat cards
  document.getElementById('stat-total').textContent     = fmtUSD(stats.total);
  document.getElementById('stat-total-rwf').textContent = fmtRWF(stats.total, settings.rateRWF);
  document.getElementById('stat-count').textContent     = stats.count;
  document.getElementById('stat-avg').textContent       = fmtUSD(stats.avg);

  if (stats.topCat) {
    document.getElementById('stat-top-cat').textContent        = stats.topCat[0];
    document.getElementById('stat-top-cat-amount').textContent = fmtUSD(stats.topCat[1]);
  } else {
    document.getElementById('stat-top-cat').textContent        = '—';
    document.getElementById('stat-top-cat-amount').textContent = '';
  }

  renderCapMeter(stats.total, settings.cap);
  renderCategoryBreakdown(stats.catBreakdown, stats.total);
  renderTrendChart(stats.trend);
}


// Budget cap progress bar
function renderCapMeter(spent, cap) {
  var percent   = cap > 0 ? Math.min((spent / cap) * 100, 100) : 0;
  var bar       = document.getElementById('cap-bar');
  var pulse     = document.getElementById('cap-pulse');
  var message   = document.getElementById('cap-message');
  var container = document.querySelector('.cap-bar-container');

  document.getElementById('cap-spent').textContent = fmtUSD(spent) + ' spent';
  document.getElementById('cap-limit').textContent = fmtUSD(cap);

  bar.style.width   = percent + '%';
  pulse.style.left  = percent + '%';

  // Toggle pulse dot visibility
  if (percent > 0) {
    pulse.classList.add('active');
  } else {
    pulse.classList.remove('active');
  }

  // Update ARIA progressbar value
  container.setAttribute('aria-valuenow', Math.round(percent));

  var remaining = cap - spent;
  var isOver    = remaining < 0;

  // Toggle red overage style
  if (isOver) {
    bar.classList.add('overage');
    pulse.classList.add('overage');
  } else {
    bar.classList.remove('overage');
    pulse.classList.remove('overage');
  }

  // Status message
  if (isOver) {
    var overAmount = fmtUSD(Math.abs(remaining));
    message.textContent = '⚠ Over budget by ' + overAmount + '!';
    message.className   = 'cap-message danger';
    announce('Warning: you are over your budget by ' + overAmount, true);

  } else if (percent >= 80) {
    message.textContent = '⚡ ' + fmtUSD(remaining) + ' remaining — approaching limit.';
    message.className   = 'cap-message warning';
    announce('Approaching budget limit — ' + fmtUSD(remaining) + ' remaining.');

  } else if (spent > 0) {
    message.textContent = '✓ ' + fmtUSD(remaining) + ' remaining of ' + fmtUSD(cap) + ' budget.';
    message.className   = 'cap-message good';

  } else {
    message.textContent = 'Budget cap: ' + fmtUSD(cap) + '. No spending recorded yet.';
    message.className   = 'cap-message';
  }
}


// Category horizontal bar chart
function renderCategoryBreakdown(catBreakdown, total) {
  var container = document.getElementById('category-bars');

  if (catBreakdown.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:.82rem">No records yet.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < catBreakdown.length; i++) {
    var item    = catBreakdown[i];
    var percent = total > 0 ? (item.amount / total) * 100 : 0;
    var color   = catColor(item.cat);

    html += '<div class="cat-bar-row">';
    html += '  <span class="cat-bar-label">' + escapeHtml(item.cat) + '</span>';
    html += '  <div class="cat-bar-track" role="progressbar"';
    html += '    aria-valuenow="' + Math.round(percent) + '"';
    html += '    aria-valuemin="0" aria-valuemax="100"';
    html += '    aria-label="' + escapeHtml(item.cat) + ' ' + Math.round(percent) + '%">';
    html += '    <div class="cat-bar-fill" style="width:' + percent + '%;background:' + color + '"></div>';
    html += '  </div>';
    html += '  <span class="cat-bar-amount">' + fmtUSD(item.amount) + '</span>';
    html += '</div>';
  }

  container.innerHTML = html;
}


// 7-day bar chart
function renderTrendChart(trend) {
  var chart  = document.getElementById('trend-chart');
  var labels = document.getElementById('trend-labels');

  // Find the tallest bar so we can scale everything relative to it
  var max = 0;
  for (var i = 0; i < trend.length; i++) {
    if (trend[i].total > max) max = trend[i].total;
  }
  if (max === 0) max = 1; // avoid division by zero

  var chartHtml  = '';
  var labelsHtml = '';

  for (var j = 0; j < trend.length; j++) {
    var day     = trend[j];
    var percent = (day.total / max) * 100;
    var valText = day.total > 0 ? fmtUSD(day.total) : '';

    chartHtml += '<div class="trend-bar-wrap">';
    chartHtml += '  <div class="trend-bar" style="height:' + percent + '%" title="' + day.label + ': ' + fmtUSD(day.total) + '">';
    chartHtml += '    <span class="trend-bar-val">' + valText + '</span>';
    chartHtml += '  </div>';
    chartHtml += '</div>';

    labelsHtml += '<span class="trend-label">' + day.label + '</span>';
  }

  chart.innerHTML  = chartHtml;
  labels.innerHTML = labelsHtml;
}


// =============================================
// RECORDS TABLE & CARDS
// =============================================
function renderRecords() {
  var records = getFilteredSorted();
  var ui      = getUIState();

  // Build the regex for highlighting
  var flags = ui.searchCaseSensitive ? '' : 'i';
  var regex = ui.searchQuery ? compileRegex(ui.searchQuery, flags) : null;

  // Update record count text
  var countEl = document.getElementById('records-count');
  var word    = records.length === 1 ? 'record' : 'records';
  countEl.textContent = records.length + ' ' + word + ' shown';

  // Show or hide the empty state message
  var emptyEl = document.getElementById('empty-state');
  emptyEl.hidden = records.length > 0;

  // Build table rows
  var tbody    = document.getElementById('records-tbody');
  var rowsHtml = '';
  for (var i = 0; i < records.length; i++) {
    rowsHtml += buildTableRow(records[i], regex, ui);
  }
  tbody.innerHTML = rowsHtml;

  // Build mobile cards
  var cards     = document.getElementById('records-cards');
  var cardsHtml = '';
  for (var j = 0; j < records.length; j++) {
    cardsHtml += buildCard(records[j], regex);
  }
  cards.innerHTML = cardsHtml;
}


// Build one <tr> for the desktop table
function buildTableRow(record, regex, ui) {
  var descHL   = highlight(record.description, regex);
  var amountHL = ui.searchDescOnly
    ? escapeHtml(String(record.amount))
    : highlight(String(record.amount), regex);

  var chip = catClass(record.category);
  var safeDesc = escapeHtml(record.description);

  var html = '<tr data-id="' + record.id + '">';
  html += '<td class="td-desc">'    + descHL + '</td>';
  html += '<td class="td-amount">$' + amountHL + '</td>';
  html += '<td><span class="cat-chip ' + chip + '">' + escapeHtml(record.category) + '</span></td>';
  html += '<td class="td-date">'    + escapeHtml(record.date) + '</td>';
  html += '<td class="td-actions">';
  html += '  <button class="btn-icon edit" data-action="edit" data-id="' + record.id + '" aria-label="Edit ' + safeDesc + '">';
  html += '    Edit';
  html += '  </button>';
  html += '  <button class="btn-icon delete" data-action="delete" data-id="' + record.id + '" aria-label="Delete ' + safeDesc + '">';
  html += '    Del';
  html += '  </button>';
  html += '</td>';
  html += '</tr>';

  return html;
}


// Build one card for the mobile view
function buildCard(record, regex) {
  var descHL  = highlight(record.description, regex);
  var chip    = catClass(record.category);
  var safeDesc = escapeHtml(record.description);

  var html = '<div class="rec-card" data-id="' + record.id + '">';
  html += '<div class="rec-card-header">';
  html += '  <span class="rec-card-desc">' + descHL + '</span>';
  html += '  <span class="rec-card-amount">' + fmtUSD(record.amount) + '</span>';
  html += '</div>';
  html += '<div class="rec-card-meta">';
  html += '  <span class="cat-chip ' + chip + '">' + escapeHtml(record.category) + '</span>';
  html += '  <span class="rec-card-date">' + escapeHtml(record.date) + '</span>';
  html += '</div>';

  if (record.notes) {
    html += '<p style="font-size:.78rem;color:#64748b;margin-top:.4rem">' + escapeHtml(record.notes) + '</p>';
  }

  html += '<div class="rec-card-actions">';
  html += '  <button class="btn-icon edit" data-action="edit" data-id="' + record.id + '" aria-label="Edit ' + safeDesc + '">Edit</button>';
  html += '  <button class="btn-icon delete" data-action="delete" data-id="' + record.id + '" aria-label="Delete ' + safeDesc + '">Delete</button>';
  html += '</div>';
  html += '</div>';

  return html;
}


// =============================================
// SORT BUTTONS
// =============================================
function updateSortButtons(activeKey, activeDir) {
  var buttons = document.querySelectorAll('.sort-btn');
  for (var i = 0; i < buttons.length; i++) {
    var btn      = buttons[i];
    var key      = btn.dataset.sort;
    var isActive = key === activeKey;

    if (isActive) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    btn.setAttribute('aria-pressed', String(isActive));

    var arrow = btn.querySelector('.sort-arrow');
    if (arrow) {
      if (isActive) {
        arrow.textContent = activeDir === 'asc' ? '↑' : '↓';
      } else {
        arrow.textContent = '↕';
      }
    }
  }
}


// =============================================
// FILTER CHIPS
// =============================================
function renderFilterChips(categories, activeCategory) {
  var container = document.getElementById('category-filters');
  var all       = ['All'].concat(categories);
  var html      = '';

  for (var i = 0; i < all.length; i++) {
    var cat      = all[i];
    var val      = cat === 'All' ? '' : cat;
    var isActive = (activeCategory === null && cat === 'All') || activeCategory === cat;

    html += '<button class="filter-chip ' + (isActive ? 'active' : '') + '"';
    html += ' data-cat="' + val + '"';
    html += ' aria-pressed="' + isActive + '">';
    html += escapeHtml(cat);
    html += '</button>';
  }

  container.innerHTML = html;
}


// =============================================
// SEARCH STATUS
// =============================================
function updateSearchStatus(query, count, isValidRegex) {
  var el    = document.getElementById('search-status');
  var input = document.getElementById('search-input');
  if (!el) return;

  if (!query) {
    el.textContent = '';
    input.classList.remove('regex-error');
    return;
  }

  if (!isValidRegex) {
    el.textContent = '✗ Invalid regex pattern';
    input.classList.add('regex-error');
  } else {
    var word = count === 1 ? 'match' : 'matches';
    el.textContent = count + ' ' + word;
    input.classList.remove('regex-error');
  }
}


// =============================================
// FORM HELPERS
// =============================================
function showFieldError(fieldId, message) {
  var errEl   = document.getElementById('err-' + fieldId);
  var inputEl = document.getElementById('field-' + fieldId);

  if (errEl) {
    errEl.textContent = message;
    errEl.hidden      = false;
  }
  if (inputEl) {
    inputEl.classList.add('invalid');
    inputEl.classList.remove('valid');
  }
}

function clearFieldError(fieldId) {
  var errEl   = document.getElementById('err-' + fieldId);
  var inputEl = document.getElementById('field-' + fieldId);

  if (errEl) {
    errEl.textContent = '';
    errEl.hidden      = true;
  }
  if (inputEl) {
    inputEl.classList.remove('invalid');
  }
}

function markFieldValid(fieldId) {
  var inputEl = document.getElementById('field-' + fieldId);
  if (inputEl) {
    inputEl.classList.add('valid');
    inputEl.classList.remove('invalid');
  }
}

function showFieldWarning(fieldId, message) {
  var errEl = document.getElementById('err-' + fieldId);
  if (errEl) {
    errEl.textContent   = message;
    errEl.hidden        = false;
    errEl.style.color   = '#ca8a04';
  }
}


// =============================================
// CATEGORY SELECT (in the form)
// =============================================
function populateCategorySelect(categories) {
  var select = document.getElementById('field-category');
  if (!select) return;

  var current = select.value;
  var html    = '<option value="">— Select category —</option>';

  for (var i = 0; i < categories.length; i++) {
    var selected = current === categories[i] ? ' selected' : '';
    html += '<option value="' + escapeHtml(categories[i]) + '"' + selected + '>';
    html += escapeHtml(categories[i]);
    html += '</option>';
  }

  select.innerHTML = html;
}


// =============================================
// CATEGORIES LIST (in settings)
// =============================================
function renderCategoriesList(categories) {
  var container = document.getElementById('categories-list');
  if (!container) return;

  var html = '';
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    html += '<div class="cat-tag" role="listitem">';
    html += '  <span>' + escapeHtml(cat) + '</span>';
    html += '  <button class="cat-tag-del"';
    html += '    data-action="remove-category"';
    html += '    data-cat="' + escapeHtml(cat) + '"';
    html += '    aria-label="Remove ' + escapeHtml(cat) + '">';
    html += '    ×';
    html += '  </button>';
    html += '</div>';
  }

  container.innerHTML = html;
}


// =============================================
// FORM MODE (Add vs Edit)
// =============================================
function setFormMode(isEdit) {
  var eyebrow   = document.getElementById('form-eyebrow');
  var heading   = document.getElementById('form-heading');
  var submitBtn = document.getElementById('form-submit-btn');

  if (isEdit) {
    eyebrow.textContent   = '04 / Edit Record';
    heading.textContent   = 'Edit Transaction';
    submitBtn.textContent = '✓ Update Record';
  } else {
    eyebrow.textContent   = '04 / Add Record';
    heading.textContent   = 'New Transaction';
    submitBtn.textContent = '💾 Save Record';
  }
}


// =============================================
// CONFIRM MODAL
// =============================================
var confirmCallback = null;

function showConfirm(message, onYes) {
  var modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-message').textContent = message;
  modal.hidden    = false;
  confirmCallback = onYes;
  // Move focus to Yes button for keyboard users
  setTimeout(function() {
    document.getElementById('confirm-yes').focus();
  }, 50);
}

function hideConfirm() {
  document.getElementById('confirm-modal').hidden = true;
  confirmCallback = null;
}

function getConfirmCallback() {
  return confirmCallback;
}
