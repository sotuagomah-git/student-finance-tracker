# FinTrack — Student Finance Tracker

> **Theme:** Student Finance Tracker  
> **Deployment:** GitHub Pages  
> **Stack:** Vanilla HTML · CSS · ES Modules (no frameworks)

---

## Live Demo
[https://sotuagomah-git.github.io/student-finance-tracker](https://sotuagomah-git.github.io/student-finance-tracker)

---

## Features

| # | Feature | Status |
|---|---------|--------|
| 1 | 5-section SPA (About, Dashboard, Records, Add/Edit, Settings) 
| 2 | Add, edit, delete transactions 
| 3 | 6 default categories (Food, Books, Transport, Entertainment, Fees, Other) 
| 4 | Live regex-powered search with `<mark>` highlights 
| 5 | Sort by date / description / amount 
| 6 | Budget cap meter with ARIA live alerts 
| 7 | Stats dashboard: total, count, avg, top category, 7-day trend chart 
| 8 | USD ↔ RWF ↔ NGN manual-rate converter 
| 9 | localStorage auto-save
| 10 | JSON export + validated import 
| 11 | Manage categories (add/remove) 
| 12 | Mobile-first, 3 breakpoints (360/768/1024px) 
| 13 | Full keyboard navigation + skip-to-content
| 14 | ARIA live regions (polite & assertive)
| 15 | Seed data loader (12 diverse records) 

---

## Regex Catalog

### Validation Rules

| # | Pattern | Purpose | Example |
|---|---------|---------|---------|
| 1 | `/^\S(?:.*\S)?$\|^\S$/` | Description — no leading/trailing spaces | `"Lunch"`, `" Lunch "` flagged |
| 2 | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Amount — valid decimal ≤2dp | `"12.50"` correct, `"012"` flagged |
| 3 | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Date — strict YYYY-MM-DD | `"2025-09-29"` correct, `"2025-13-01"` flagged |
| 4 | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Category — letters/spaces/hyphens | `"Bus Pass"` correct, `"Food2"` flagged |

### Advanced Patterns

| # | Pattern | Type | Purpose |
|---|---------|------|---------|
| 5 | `/\b(\w+)\s+\1\b/i` | **Back-reference** | Detect duplicate consecutive words in notes (`"the the"`) |
| 6 | `/^(?!0+(?:\.0+)?$)(0\|[1-9]\d*)(\.\d{1,2})?$/` | **Lookahead** (negative) | Amount must be > 0; rejects `"0"`, `"0.00"` |

### Finance Tracker Search Patterns

| Pattern | Matches |
|---------|---------|
| `\.\d{2}\b` | Records with cents present (e.g. $12.50) |
| `(coffee\|tea)` | Beverage keywords in descriptions |
| `\b(\w+)\s+\1\b` | Duplicate consecutive words (also used in form validation) |
| `^[A-Z]` | Descriptions starting with an uppercase letter |
| `(?<=\$)\d+\.\d{2}` | Dollar amounts using **lookbehind** |
| `\d{4}-\d{2}-\d{2}` | ISO date format tokens |

---

## Keyboard Map

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous element |
| `Enter` | Activate button/link, submit form |
| `Space` | Toggle checkbox |
| `Escape` | Close confirm modal / close mobile nav |
| `Alt+1…5` | *(Nav links)* Click nav link by tab order |
| Skip link | First tab stop → jumps to `#main-content` |

---

## Accessibility Notes

- **Landmarks:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` with `role` and `aria-label`
- **Headings:** Single `<h1>` per section; logical `h2`/`h3` hierarchy
- **Labels:** Every `<input>` and `<select>` has an associated `<label>` (explicit `for`/`id` pairing)
- **ARIA live regions:**
  - `role="status"` / `aria-live="polite"` — routine announcements (saved, sorted, filtered)
  - `role="alert"` / `aria-live="assertive"` — budget exceeded, import errors
- **Focus:** Visible yellow outline (`outline: 2px solid #e6f542`) on all interactive elements
- **Skip link:** First tab stop jumps to `#main-content`
- **Modal:** `role="dialog"`, `aria-modal="true"`, focus trapped to Yes/Cancel, Escape closes
- **Color contrast:** Background `#0d1117` + text `#e8edf3` = ~14:1 ratio; accent yellow on dark > 7:1
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables all animations
- **Table:** `<thead>`, `scope="col"`, descriptive `aria-label` on wrapper
- **Progress bars:** `role="progressbar"` with `aria-valuenow`/`min`/`max`

---

## How to Run Tests

Open `tests.html` in a browser (no server needed — uses ES module inline script).

All assertions run on page load. Green banner = all pass.

---

## Project Structure

```
student-finance-tracker/
├── index.html          # Main SPA shell
├── tests.html          # Validator unit tests (M3)
├── seed.json           # 12+ diverse seed records
├── README.md
├── styles/
│   └── main.css        # Mobile-first CSS (360/768/1024px)
└── scripts/
    ├── app.js          # Main orchestrator (ES module)
    ├── state.js        # State management
    ├── ui.js           # DOM rendering
    ├── validators.js   # Regex rules + highlight
    └── storage.js      # localStorage + JSON import/export
```

---

## Milestones

| Milestone | Description | Status |
|-----------|-------------|--------|
| M1 | Spec & Wireframes — data model, a11y plan, regex catalog 
| M2 | Semantic HTML & Base CSS — 5 sections, mobile-first, Flexbox 
| M3 | Forms & Regex Validation — 6 rules (4 standard + 2 advanced) 
| M4 | Render + Sort + Regex Search — table/cards, 3-column sort, live highlight 
| M5 | Stats + Cap/Targets — dashboard, trend chart, ARIA live alerts 
| M6 | Persistence + Import/Export + Settings — localStorage, JSON round-trip, converter 
| M7 | Polish & A11y Audit — keyboard, animations, focus, contrast, reduced motion 

---

## Currency Rates (Manual, Editable in Settings)

| Pair | Default Rate |
|------|-------------|
| 1 USD → RWF | 1,350 |
| 1 USD → NGN | 1,580 |

Rates are stored in `localStorage` and can be updated in **Settings → Currency & Conversion**.
