/**
 * validators.js
 * Regex rules for form validation and search highlighting.
 * Each function returns a plain object: { ok: true } or { ok: false, message: "..." }
 */

// =============================================
// REGEX PATTERNS
// Rule 1: Description — no leading/trailing spaces
var RX_DESCRIPTION = /^\S(?:.*\S)?$|^\S$/;

// Rule 2: Amount — valid number, up to 2 decimal places, no leading zeros
var RX_AMOUNT = /^(0|[1-9]\d*)(\.\d{1,2})?$/;

// Rule 3: Date — strict YYYY-MM-DD format
var RX_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Rule 4: Category — letters, spaces, and hyphens only
var RX_CATEGORY = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

// Rule 5 (ADVANCED — back-reference): catches duplicate words like "the the"
var RX_DUP_WORD = /\b(\w+)\s+\1\b/i;

// Rule 6 (ADVANCED — negative lookahead): amount must be greater than zero
var RX_AMOUNT_NONZERO = /^(?!0+(?:\.0+)?$)(0|[1-9]\d*)(\.\d{1,2})?$/;
// =============================================


// Validate the description field
function validateDescription(value) {
  if (!value || value.trim() === '') {
    return { ok: false, message: 'Description is required.' };
  }
  if (!RX_DESCRIPTION.test(value)) {
    return { ok: false, message: 'No leading or trailing spaces allowed.' };
  }
  if (value.length > 120) {
    return { ok: false, message: 'Description must be 120 characters or fewer.' };
  }
  return { ok: true };
}


// Validate the amount field
function validateAmount(value) {
  var str = String(value).trim();

  if (!str) {
    return { ok: false, message: 'Amount is required.' };
  }
  if (!RX_AMOUNT.test(str)) {
    return { ok: false, message: 'Enter a valid number (e.g. 12 or 12.50).' };
  }
  if (!RX_AMOUNT_NONZERO.test(str)) {
    return { ok: false, message: 'Amount must be greater than zero.' };
  }

  return { ok: true, value: parseFloat(str) };
}


// Validate the date field
function validateDate(value) {
  if (!value) {
    return { ok: false, message: 'Date is required.' };
  }
  if (!RX_DATE.test(value)) {
    return { ok: false, message: 'Use YYYY-MM-DD format (e.g. 2025-09-29).' };
  }
  return { ok: true };
}


// Validate a category name
function validateCategory(value) {
  if (!value || value.trim() === '') {
    return { ok: false, message: 'Category is required.' };
  }
  if (!RX_CATEGORY.test(value.trim())) {
    return { ok: false, message: 'Category: letters, spaces, and hyphens only.' };
  }
  return { ok: true };
}


// Validate the notes field — soft warning only, not a hard error
function validateNotes(value) {
  if (!value) {
    return { ok: true };
  }
  var match = RX_DUP_WORD.exec(value);
  if (match) {
    return { ok: true, warning: 'Possible duplicate word: "' + match[0] + '"' };
  }
  return { ok: true };
}


// Safely compile a regex string — returns null if the pattern is invalid
function compileRegex(input, flags) {
  flags = flags || 'i';
  if (!input || input.trim() === '') {
    return null;
  }
  try {
    return new RegExp(input, flags);
  } catch (e) {
    return null;
  }
}


// Wrap matched text in <mark> tags for search highlighting
// Escapes HTML first to prevent XSS
function highlight(text, regex) {
  if (!regex || !text) {
    return escapeHtml(text || '');
  }
  var escaped = escapeHtml(text);
  try {
    return escaped.replace(regex, function(match) {
      return '<mark>' + match + '</mark>';
    });
  } catch (e) {
    return escaped;
  }
}


// Escape HTML characters to prevent XSS when inserting into innerHTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


// Generate a unique record ID like "rec_0001"
function generateId(existingIds) {
  existingIds = existingIds || [];
  var n = existingIds.length + 1;
  var id;
  do {
    id = 'rec_' + String(n).padStart(4, '0');
    n++;
  } while (existingIds.indexOf(id) !== -1);
  return id;
}


// Return today's date as a YYYY-MM-DD string
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
