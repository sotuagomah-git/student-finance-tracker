/**
 * app.js
 * Main entry point. Wires up all event listeners and starts the app.
 * All functions are plain, named functions — no advanced patterns.
 */

// The list of all section IDs in the app
var SECTIONS = ['about', 'dashboard', 'records', 'add-edit', 'settings'];

// Tracks which record is being edited (null if adding new)
var editingId = null;


// =============================================
// NAVIGATION
// =============================================
// Shows one section, hides all others
// Also updates the active nav link and refreshes section data
function navigate(sectionId) {
  // Show/hide sections
  for (var i = 0; i < SECTIONS.length; i++) {
    var id = SECTIONS[i];
    var el = document.getElementById(id);
    if (!el) continue;

    if (id === sectionId) {
      el.removeAttribute('hidden');
      el.classList.add('active');
    } else {
      el.setAttribute('hidden', '');
      el.classList.remove('active');
    }
  }

  // Update nav link styles
  var navLinks = document.querySelectorAll('.nav-link');
  for (var j = 0; j < navLinks.length; j++) {
    var link = navLinks[j];
    if (link.dataset.section === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  }

  // Close mobile nav
  var nav    = document.getElementById('primary-nav');
  var toggle = document.querySelector('.nav-toggle');
  nav.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');

  // Refresh data for the section we just navigated to
  if (sectionId === 'dashboard') renderDashboard();
  if (sectionId === 'records')   refreshRecords();
  if (sectionId === 'settings')  refreshSettings();

  window.scrollTo(0, 0);
}

// Make navigate available for inline HTML onclick (empty state button)
window.app = { navigate: navigate };


// =============================================
// RECORDS PAGE REFRESH
// =============================================
function refreshRecords() {
  var cats = getCategories();
  var ui   = getUIState();
  renderFilterChips(cats, ui.filterCategory);
  updateSortButtons(ui.sortKey, ui.sortDir);
  renderRecords();
  refreshSearchStatus();
}

function refreshSearchStatus() {
  var ui    = getUIState();
  var flags = ui.searchCaseSensitive ? '' : 'i';
  var regex = ui.searchQuery ? compileRegex(ui.searchQuery, flags) : null;
  var isValid = !ui.searchQuery || regex !== null;

  var count = 0;
  if (regex) {
    var all = getRecords();
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      var matched = ui.searchDescOnly
        ? regex.test(r.description)
        : regex.test(r.description) || regex.test(String(r.amount)) ||
          regex.test(r.category)    || regex.test(r.date) ||
          regex.test(r.notes || '');
      if (matched) count++;
    }
  }

  updateSearchStatus(ui.searchQuery, count, isValid);
}


// =============================================
// NAVIGATION EVENT LISTENERS
// =============================================
function bindNav() {
  // Logo click goes to dashboard
  var logo = document.querySelector('.logo');
  logo.addEventListener('click', function() {
    navigate('dashboard');
  });

  // Nav links
  var navLinks = document.querySelectorAll('.nav-link');
  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var section = this.dataset.section;
      if (section) navigate(section);
    });
  }

  // Mobile hamburger toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav    = document.getElementById('primary-nav');

  toggle.addEventListener('click', function() {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    } else {
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('open');
    }
  });

  // Press Escape to close mobile nav
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}


// =============================================
// SORT BUTTONS
// =============================================
function bindSortButtons() {
  var buttons = document.querySelectorAll('.sort-btn');

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function() {
      var key = this.dataset.sort;
      var ui  = getUIState();
      var dir;

      // If clicking the same key, flip direction. Otherwise use default.
      if (ui.sortKey === key) {
        dir = ui.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        dir = (key === 'date' || key === 'amount') ? 'desc' : 'asc';
      }

      setSort(key, dir);
      updateSortButtons(key, dir);
      renderRecords();

      var dirWord = dir === 'asc' ? 'ascending' : 'descending';
      announce('Sorted by ' + key + ', ' + dirWord + '.');
    });
  }
}


// =============================================
// SEARCH
// =============================================
function bindSearch() {
  var input   = document.getElementById('search-input');
  var caseChk = document.getElementById('search-case');
  var descChk = document.getElementById('search-desc-only');

  function onSearchChange() {
    setSearch(input.value, caseChk.checked, descChk.checked);
    renderRecords();
    refreshSearchStatus();
  }

  input.addEventListener('input', onSearchChange);
  caseChk.addEventListener('change', onSearchChange);
  descChk.addEventListener('change', onSearchChange);
}


// =============================================
// FILTER CHIPS (category filter)
// =============================================
function bindFilterChips() {
  var container = document.getElementById('category-filters');

  container.addEventListener('click', function(e) {
    var chip = e.target.closest('.filter-chip');
    if (!chip) return;

    // data-cat is empty string for "All", or the category name
    var cat = chip.dataset.cat || null;
    setFilterCategory(cat);
    renderFilterChips(getCategories(), cat);
    renderRecords();

    var msg = cat ? 'Filtered to ' + cat + '.' : 'Showing all categories.';
    announce(msg);
  });
}


// =============================================
// FORM — ADD / EDIT
// =============================================
function resetForm() {
  var form = document.getElementById('transaction-form');
  form.reset();

  // Clear hidden edit ID
  document.getElementById('field-edit-id').value = '';

  // Set today as default date
  document.getElementById('field-date').value = todayISO();

  // Hide custom category field
  document.getElementById('custom-category-group').hidden = true;

  // Clear editing state
  editingId = null;
  setFormMode(false);

  // Clear all field errors and validity styles
  var fields = ['description', 'amount', 'category', 'custom-category', 'date', 'notes'];
  for (var i = 0; i < fields.length; i++) {
    clearFieldError(fields[i]);
    var inp = document.getElementById('field-' + fields[i]);
    if (inp) {
      inp.classList.remove('valid', 'invalid');
    }
  }

  // Hide global error
  var globalErr = document.getElementById('form-global-error');
  globalErr.hidden = true;
}


function populateForm(record) {
  document.getElementById('field-description').value = record.description || '';
  document.getElementById('field-amount').value      = record.amount      || '';
  document.getElementById('field-date').value        = record.date        || todayISO();
  document.getElementById('field-notes').value       = record.notes       || '';
  document.getElementById('field-edit-id').value     = record.id;

  populateCategorySelect(getCategories());

  var categories = getCategories();
  var select     = document.getElementById('field-category');
  var found      = false;

  for (var i = 0; i < categories.length; i++) {
    if (categories[i] === record.category) {
      found = true;
      break;
    }
  }

  if (found) {
    select.value = record.category;
    document.getElementById('custom-category-group').hidden = true;
  } else {
    select.value = '';
    document.getElementById('field-custom-category').value = record.category;
    document.getElementById('custom-category-group').hidden = false;
  }

  editingId = record.id;
  setFormMode(true);
}


function bindForm() {
  var form      = document.getElementById('transaction-form');
  var catSelect = document.getElementById('field-category');
  var cancelBtn = document.getElementById('form-cancel-btn');

  // Show custom category field only when needed
  catSelect.addEventListener('change', function() {
    // (Custom category logic kept simple — hidden by default)
    document.getElementById('custom-category-group').hidden = true;
  });

  // Real-time validation — check each field when user leaves it
  document.getElementById('field-description').addEventListener('blur', function() {
    var result = validateDescription(this.value);
    if (!result.ok) {
      showFieldError('description', result.message);
    } else {
      clearFieldError('description');
      markFieldValid('description');
    }
  });

  document.getElementById('field-amount').addEventListener('blur', function() {
    var result = validateAmount(this.value);
    if (!result.ok) {
      showFieldError('amount', result.message);
    } else {
      clearFieldError('amount');
      markFieldValid('amount');
    }
  });

  document.getElementById('field-date').addEventListener('blur', function() {
    var result = validateDate(this.value);
    if (!result.ok) {
      showFieldError('date', result.message);
    } else {
      clearFieldError('date');
      markFieldValid('date');
    }
  });

  document.getElementById('field-notes').addEventListener('blur', function() {
    var result = validateNotes(this.value);
    clearFieldError('notes');
    if (result.warning) {
      showFieldWarning('notes', result.warning);
    }
  });

  // Form submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    handleFormSubmit();
  });

  // Cancel button
  cancelBtn.addEventListener('click', function() {
    resetForm();
    navigate('records');
  });
}


function handleFormSubmit() {
  var descVal  = document.getElementById('field-description').value;
  var amtVal   = document.getElementById('field-amount').value;
  var dateVal  = document.getElementById('field-date').value;
  var catVal   = document.getElementById('field-category').value ||
                 document.getElementById('field-custom-category').value;
  var notesVal = document.getElementById('field-notes').value;

  var hasError = false;

  // Validate description
  var dResult = validateDescription(descVal);
  if (!dResult.ok) {
    showFieldError('description', dResult.message);
    hasError = true;
  } else {
    clearFieldError('description');
    markFieldValid('description');
  }

  // Validate amount
  var aResult = validateAmount(amtVal);
  if (!aResult.ok) {
    showFieldError('amount', aResult.message);
    hasError = true;
  } else {
    clearFieldError('amount');
    markFieldValid('amount');
  }

  // Validate date
  var dtResult = validateDate(dateVal);
  if (!dtResult.ok) {
    showFieldError('date', dtResult.message);
    hasError = true;
  } else {
    clearFieldError('date');
    markFieldValid('date');
  }

  // Validate category
  var cResult = validateCategory(catVal);
  if (!cResult.ok) {
    showFieldError('category', cResult.message);
    hasError = true;
  } else {
    clearFieldError('category');
    markFieldValid('category');
  }

  // Stop if any field failed
  if (hasError) {
    var globalErr = document.getElementById('form-global-error');
    globalErr.textContent = 'Please fix the errors above before saving.';
    globalErr.hidden      = false;
    announce('Form has errors. Please correct them.', true);
    return;
  }

  document.getElementById('form-global-error').hidden = true;

  var now        = new Date().toISOString();
  var categories = getCategories();

  // If category is new, add it
  var catExists = false;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i] === catVal) { catExists = true; break; }
  }
  if (catVal && !catExists) {
    addCategory(catVal);
    populateCategorySelect(getCategories());
  }

  if (editingId) {
    // Update existing record
    updateRecord(editingId, {
      description: descVal.trim(),
      amount:      parseFloat(amtVal),
      category:    catVal,
      date:        dateVal,
      notes:       notesVal.trim(),
      updatedAt:   now
    });
    announce('Record "' + descVal.trim() + '" updated.');

  } else {
    // Add new record
    var existingIds = [];
    var records = getRecords();
    for (var j = 0; j < records.length; j++) {
      existingIds.push(records[j].id);
    }

    var newRecord = {
      id:          generateId(existingIds),
      description: descVal.trim(),
      amount:      parseFloat(amtVal),
      category:    catVal,
      date:        dateVal,
      notes:       notesVal.trim(),
      createdAt:   now,
      updatedAt:   now
    };

    addRecord(newRecord);
    announce('Record "' + descVal.trim() + '" saved.');
  }

  resetForm();
  navigate('records');
}


// =============================================
// EDIT / DELETE (table and cards)
// =============================================
function bindTableActions() {
  // Listen on the table body
  document.getElementById('records-tbody').addEventListener('click', function(e) {
    handleRowAction(e);
  });
  // Listen on the mobile cards container
  document.getElementById('records-cards').addEventListener('click', function(e) {
    handleRowAction(e);
  });
}

function handleRowAction(e) {
  // Find the button that was clicked, even if a child element was the target
  var btn = e.target.closest('[data-action]');
  if (!btn) return;

  var action = btn.dataset.action;
  var id     = btn.dataset.id;

  // Find the matching record
  var records = getRecords();
  var record  = null;
  for (var i = 0; i < records.length; i++) {
    if (records[i].id === id) {
      record = records[i];
      break;
    }
  }
  if (!record) return;

  if (action === 'edit') {
    populateCategorySelect(getCategories());
    populateForm(record);
    navigate('add-edit');
  }

  if (action === 'delete') {
    showConfirm(
      'Delete "' + record.description + '" (' + fmtUSD(record.amount) + ')? This cannot be undone.',
      function() {
        deleteRecord(id);
        renderRecords();
        renderDashboard();
        announce('Deleted "' + record.description + '".');
        hideConfirm();
      }
    );
  }
}


// =============================================
// CONFIRM MODAL
// =============================================
function bindModal() {
  document.getElementById('confirm-yes').addEventListener('click', function() {
    var cb = getConfirmCallback();
    if (cb) cb();
  });

  document.getElementById('confirm-no').addEventListener('click', function() {
    hideConfirm();
  });

  // Click outside the box to close
  document.getElementById('confirm-modal').addEventListener('click', function(e) {
    if (e.target === this) hideConfirm();
  });

  // Escape key closes the modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('confirm-modal');
      if (!modal.hidden) hideConfirm();
    }
  });
}


// =============================================
// EXPORT / IMPORT
// =============================================
function bindExportImport() {
  // Export: build JSON and trigger download
  document.getElementById('export-btn').addEventListener('click', function() {
    var json     = exportJSON(getRecords());
    var blob     = new Blob([json], { type: 'application/json' });
    var url      = URL.createObjectURL(blob);
    var link     = document.createElement('a');
    link.href     = url;
    link.download = 'fintrack-export-' + todayISO() + '.json';
    link.click();
    URL.revokeObjectURL(url);
    announce('Records exported as JSON file.');
  });

  // Import: read selected file and validate it
  document.getElementById('import-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
      var result = importJSON(ev.target.result);

      if (!result.ok) {
        announce('Import failed: ' + result.error, true);
        alert('Import failed: ' + result.error);
        return;
      }

      var confirmed = confirm(
        'Import ' + result.records.length + ' records? This will REPLACE all current data.'
      );
      if (!confirmed) return;

      replaceAllRecords(result.records);
      renderRecords();
      renderDashboard();
      announce('Imported ' + result.records.length + ' records successfully.');
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be imported again
  });
}


// =============================================
// SETTINGS PAGE
// =============================================
function refreshSettings() {
  var s = getSettings();
  document.getElementById('rate-rwf').value     = s.rateRWF;
  document.getElementById('rate-ngn').value     = s.rateNGN;
  document.getElementById('settings-cap').value = s.cap;
  renderCategoriesList(getCategories());
  populateCategorySelect(getCategories());
}

function bindSettings() {
  // Save currency rates
  document.getElementById('save-rates-btn').addEventListener('click', function() {
    var rwf = parseFloat(document.getElementById('rate-rwf').value);
    var ngn = parseFloat(document.getElementById('rate-ngn').value);

    if (isNaN(rwf) || rwf <= 0 || isNaN(ngn) || ngn <= 0) {
      announce('Invalid rates — enter positive numbers.', true);
      return;
    }

    updateSettings({ rateRWF: rwf, rateNGN: ngn });
    announce('Rates saved: 1 USD = ' + rwf + ' RWF, 1 USD = ' + ngn + ' NGN.');
  });

  // Save budget cap
  document.getElementById('save-cap-btn').addEventListener('click', function() {
    var cap = parseFloat(document.getElementById('settings-cap').value);

    if (isNaN(cap) || cap < 0) {
      announce('Invalid cap value.', true);
      return;
    }

    updateSettings({ cap: cap });
    renderDashboard();
    announce('Budget cap set to ' + fmtUSD(cap) + '.');
  });

  // Edit cap shortcut from dashboard
  document.getElementById('edit-cap-btn').addEventListener('click', function() {
    navigate('settings');
    setTimeout(function() {
      document.getElementById('settings-cap').focus();
    }, 300);
  });

  // Currency converter
  document.getElementById('conv-btn').addEventListener('click', function() {
    var settings = getSettings();
    var amount   = parseFloat(document.getElementById('conv-amount').value);
    var from     = document.getElementById('conv-from').value;
    var to       = document.getElementById('conv-to').value;
    var result   = document.getElementById('conv-result');

    if (isNaN(amount) || amount < 0) {
      result.textContent = 'Enter a valid amount.';
      return;
    }

    // Convert everything to USD first, then to the target currency
    var toUSD   = { USD: 1, RWF: 1 / settings.rateRWF, NGN: 1 / settings.rateNGN };
    var fromUSD = { USD: 1, RWF: settings.rateRWF,     NGN: settings.rateNGN     };

    var inUSD     = amount * toUSD[from];
    var converted = inUSD * fromUSD[to];

    // Format each currency differently
    function formatCurrency(n, currency) {
      if (currency === 'USD') return '$' + n.toFixed(2);
      if (currency === 'RWF') return Math.round(n).toLocaleString() + ' RWF';
      if (currency === 'NGN') return '₦' + Math.round(n).toLocaleString();
      return n.toFixed(2);
    }

    var output = formatCurrency(amount, from) + ' = ' + formatCurrency(converted, to);
    result.textContent = output;
    announce(output);
  });

  // Add new category
  document.getElementById('add-category-btn').addEventListener('click', function() {
    var input  = document.getElementById('new-category-input');
    var errEl  = document.getElementById('err-new-cat');
    var val    = input.value.trim();
    var result = validateCategory(val);

    if (!result.ok) {
      errEl.textContent = result.message;
      errEl.hidden      = false;
      return;
    }

    var added = addCategory(val);
    if (!added) {
      errEl.textContent = '"' + val + '" already exists.';
      errEl.hidden      = false;
      return;
    }

    errEl.hidden  = true;
    input.value   = '';
    renderCategoriesList(getCategories());
    populateCategorySelect(getCategories());
    announce('Category "' + val + '" added.');
  });

  // Remove category (click delegated from the list)
  document.getElementById('categories-list').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action="remove-category"]');
    if (!btn) return;

    var cat = btn.dataset.cat;
    removeCategory(cat);
    renderCategoriesList(getCategories());
    populateCategorySelect(getCategories());
    announce('Category "' + cat + '" removed.');
  });

  // Clear all data
  document.getElementById('clear-data-btn').addEventListener('click', function() {
    showConfirm('Delete ALL records? This cannot be undone.', function() {
      replaceAllRecords([]);
      renderDashboard();
      hideConfirm();
      announce('All data cleared.', true);
    });
  });

  // Load seed data
  document.getElementById('load-seed-btn').addEventListener('click', function() {
    loadSeedData();
  });
}


// =============================================
// SEED DATA
// =============================================
function loadSeedData() {
  var now = new Date();

  // Helper: get a date N days ago as YYYY-MM-DD
  function daysAgo(n) {
    var d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  var ts = now.toISOString();

  var seed = [
    { id:'rec_0001', description:'Lunch at cafeteria',       amount:12.50,  category:'Food',          date:daysAgo(0),  notes:'',                  createdAt:ts, updatedAt:ts },
    { id:'rec_0002', description:'Chemistry textbook',       amount:89.99,  category:'Books',         date:daysAgo(1),  notes:'For CHEM 201',       createdAt:ts, updatedAt:ts },
    { id:'rec_0003', description:'Monthly bus pass',         amount:45.00,  category:'Transport',     date:daysAgo(2),  notes:'',                  createdAt:ts, updatedAt:ts },
    { id:'rec_0004', description:'Coffee with friends',      amount:8.75,   category:'Entertainment', date:daysAgo(0),  notes:'At the campus cafe', createdAt:ts, updatedAt:ts },
    { id:'rec_0005', description:'Registration fees payment',amount:350.00, category:'Fees',          date:daysAgo(10), notes:'Semester 1 2025',    createdAt:ts, updatedAt:ts },
    { id:'rec_0006', description:'Groceries from market',    amount:27.30,  category:'Food',          date:daysAgo(3),  notes:'Weekly groceries',   createdAt:ts, updatedAt:ts },
    { id:'rec_0007', description:'Python programming book',  amount:34.95,  category:'Books',         date:daysAgo(5),  notes:'O\'Reilly edition',  createdAt:ts, updatedAt:ts },
    { id:'rec_0008', description:'Uber ride to library',     amount:6.50,   category:'Transport',     date:daysAgo(1),  notes:'',                  createdAt:ts, updatedAt:ts },
    { id:'rec_0009', description:'Movie night ticket',       amount:15.00,  category:'Entertainment', date:daysAgo(4),  notes:'Avengers screening', createdAt:ts, updatedAt:ts },
    { id:'rec_0010', description:'Late library fee',         amount:2.00,   category:'Fees',          date:daysAgo(6),  notes:'',                  createdAt:ts, updatedAt:ts },
    { id:'rec_0011', description:'Tea and snacks',           amount:3.25,   category:'Food',          date:daysAgo(2),  notes:'Morning tea',        createdAt:ts, updatedAt:ts },
    { id:'rec_0012', description:'Notebook and pens',        amount:8.00,   category:'Books',         date:daysAgo(7),  notes:'Stationery',         createdAt:ts, updatedAt:ts }
  ];

  replaceAllRecords(seed);
  renderDashboard();
  navigate('records');
  announce('Loaded ' + seed.length + ' seed records.');
}


// =============================================
// TABLE / CARD VISIBILITY (responsive swap)
// =============================================
function updateTableCardVisibility() {
  var tableWrap = document.querySelector('.table-scroll-wrap');
  var cards     = document.getElementById('records-cards');
  var isMobile  = window.innerWidth < 768;

  if (tableWrap) tableWrap.style.display = isMobile ? 'none' : '';
  if (cards)     cards.style.display     = isMobile ? 'block' : 'none';
}

window.addEventListener('resize', updateTableCardVisibility);


// =============================================
// BOOT — runs when the page finishes loading
// =============================================
function boot() {
  // Load saved data from localStorage
  initState();

  // Set today in the date field
  var dateField = document.getElementById('field-date');
  if (dateField) dateField.value = todayISO();

  // Fill the category dropdown
  populateCategorySelect(getCategories());

  // Attach all event listeners
  bindNav();
  bindSortButtons();
  bindSearch();
  bindFilterChips();
  bindForm();
  bindTableActions();
  bindModal();
  bindExportImport();
  bindSettings();

  // Show dashboard first
  navigate('dashboard');
  updateTableCardVisibility();
}

// Start the app once the HTML is fully loaded
document.addEventListener('DOMContentLoaded', boot);
