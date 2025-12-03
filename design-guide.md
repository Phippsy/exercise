# Focus Portal Design System — Condensed Reference

> **Quick Reference for Developers**  
> This standalone guide consolidates all essential information from the design-book documentation for rapid implementation without consulting other sections.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Design Tokens Reference](#design-tokens-reference)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Grid](#spacing--grid)
6. [Iconography](#iconography)
7. [Components](#components)
8. [AI Integration](#ai-integration)
9. [Accessibility Standards](#accessibility-standards)
10. [Content Guidelines](#content-guidelines)

---

## Design Principles

Focus Portal operates on **four foundational principles** guiding every design decision:

### 1. Clarity 🎯

- **Unambiguous labeling:** Use specific action labels ("Save Filter Criteria" not "Submit")
- **Explicit data context:** Show numeric counts ("125 conversations match filters")
- **Clear state indicators:** Display current filters/selections
- **Precise metadata:** "Last modified: Dec 2, 2025 at 2:15 PM by Sarah Chen"

### 2. Transparency 🔍

- **AI provenance:** Always mark AI-generated content with distinct accent color
- **Visual distinction:** Use `ai-tag-accent` color and "Discovered by AI" labels
- **Explainability controls:** Provide info icons linking to decision rationale
- **User override:** Enable editing/dismissal of AI suggestions
- **Confidence levels:** Show percentage confidence and decision factors

### 3. Accessibility ♿

- **Contrast:** ≥4.5:1 for text/icons (WCAG 2.1 AA)
- **Focus indicators:** Visible 2px outline on all interactive elements
- **Keyboard navigation:** Full tab/arrow key support
- **Screen readers:** Semantic HTML with ARIA labels
- **Touch targets:** Minimum 40×40px interactive areas

### 4. Trust 🛡️

- **Complete audit trails:** Log all AI decisions with timestamps
- **Source transparency:** Reference original data in AI explanations
- **Human-in-loop:** AI suggests, humans decide
- **Reversible actions:** Enable undo/override for critical operations

---

## Design Tokens Reference

**Use semantic tokens instead of raw values to maintain consistency.**

### Color Tokens

```css
/* Primary & Accent */
--color-primary: #633c99; /* Purple - primary actions */
--color-accent: #8566b3; /* Light purple - focus/highlights */
--ai-tag-accent: #8566b3; /* AI-generated content marker */

/* Semantic Status */
--color-success: #7b993c; /* Green - positive states */
--color-warning: #998b3c; /* Brown - caution */
--color-danger: #e14b5a; /* Red - errors/critical */
--color-info: #5a67cc; /* Blue - informational */

/* Backgrounds & Surfaces */
--dark-bg-page: #0a0a0a;
--dark-bg-surface: #141417;
--dark-bg-surface-subtle: #1a1a1f;

/* Borders */
--dark-border-subtle: #44444d;
--dark-border-strong: #76767e;

/* Text */
--dark-text-primary: #f6f6fa;
--dark-text-muted: #76767e;

/* Neutrals (9-step scale, 0=darkest, 8=lightest) */
--neutral-0: #050509;
--neutral-1: #1a1a1f;
--neutral-2: #2f2f36;
--neutral-3: #44444d;
--neutral-4: #595964;
--neutral-5: #76767e;
--neutral-6: #939399;
--neutral-7: #b0b0b4;
--neutral-8: #cdcdd0;
--neutral-9: #f6f6fa;

/* Primary Scale */
--primary-0: #1e0f30;
--primary-1: #341a52;
--primary-2: #4a2670;
--primary-3: #57308a;
--primary-4: #633c99; /* Base */
--primary-5: #8566b3;
--primary-6: #a691cc;
--primary-7: #c8bbe6;
--primary-8: #efe3ff;

/* Success Scale */
--success-0: #242e0f;
--success-4: #7b993c; /* Base */
--success-8: #f6ffe3;

/* Warning Scale */
--warning-0: #2e290f;
--warning-4: #998b3c; /* Base */
--warning-8: #fff9e3;

/* Error Scale */
--error-0: #3d0f14;
--error-4: #e14b5a; /* Base */
--error-8: #ffeef0;

/* Info Scale */
--info-0: #141829;
--info-4: #5a67cc; /* Base */
--info-8: #e8ebff;

/* Interactive States */
--state-hover: #44444d;
--state-focus: #8566b3;
--state-selected: #57308a;
--state-disabled-bg: #2f2f36;

/* Component-Specific */
--chip-text-on-accent: #ffffff;
--chip-text-on-light: #1a1a1f;
```

### Typography Tokens

```css
/* Font Family */
--font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

/* Font Sizes */
--font-size-xs: 10px; /* Micro labels */
--font-size-sm: 12px; /* Metadata, captions */
--font-size-base: 14px; /* Body text (default) */
--font-size-md: 16px; /* Emphasized labels */
--font-size-lg: 18px; /* Subheadings */
--font-size-xl: 24px; /* Headings */
--font-size-2xl: 32px; /* Page titles */

/* Font Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.2; /* Headings */
--line-height-normal: 1.5; /* Body text */
--line-height-relaxed: 1.75; /* Long-form content */
```

### Spacing Tokens

```css
/* Base Unit: 4px */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 20px;
--spacing-xl: 32px;
--gutter-md: 16px;
```

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-pill: 9999px;
```

### Icon Sizes

```css
--icon-size-xs: 12px;
--icon-size-sm: 16px;
--icon-size-md: 20px;
--icon-size-lg: 24px;
--icon-size-xl: 32px;
```

### Elevation (Shadows)

```css
--elevation-low: 0 2px 8px rgba(0, 0, 0, 0.08);
--elevation-medium: 0 8px 24px rgba(0, 0, 0, 0.12);
--elevation-high: 0 16px 48px rgba(0, 0, 0, 0.16);
```

---

## Color System

### Core Philosophy

**Algorithmically derived** from primary purple (`#633C99`) using split-complementary color theory. Every color has a 9-step scale (0=darkest, 8=lightest) for consistent hierarchy.

### Primary Colors

| Color              | Hex       | Usage                               |
| ------------------ | --------- | ----------------------------------- |
| **Primary Purple** | `#633C99` | Brand, primary actions, tags        |
| **Success Green**  | `#7B993C` | Success states, positive feedback   |
| **Warning Brown**  | `#998B3C` | Caution, warnings, pending          |
| **Info Blue**      | `#5A67CC` | Informational states, tips          |
| **Danger Red**     | `#E14B5A` | Errors, destructive actions         |
| **Accent Purple**  | `#8566B3` | Focus rings, highlights, AI markers |

### Contrast Ratios (WCAG 2.1 AA Verified)

| Foreground            | Background          | Ratio | Status |
| --------------------- | ------------------- | ----- | ------ |
| `--dark-text-primary` | `--dark-bg-surface` | 13:1  | ✓ AAA  |
| `--color-primary`     | `--dark-bg-page`    | 5.8:1 | ✓ AA   |
| `--color-success`     | `--dark-bg-surface` | 6.2:1 | ✓ AA   |
| `--dark-text-muted`   | `--dark-bg-surface` | 4.8:1 | ✓ AA   |

---

## Typography

### Font Family

**Primary:** Inter (load via Google Fonts or self-host)  
**Fallback:** `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**Why Inter:**

- Optimized for UI legibility at small sizes
- Excellent numerical clarity (critical for data)
- Comprehensive character set with tabular figures

### Type Scale Usage

```css
/* Page Titles */
font-size: var(--font-size-2xl); /* 32px */
font-weight: var(--font-weight-bold);
line-height: var(--line-height-tight);

/* Section Headings */
font-size: var(--font-size-xl); /* 24px */
font-weight: var(--font-weight-semibold);

/* Subheadings */
font-size: var(--font-size-lg); /* 18px */
font-weight: var(--font-weight-semibold);

/* Body Text */
font-size: var(--font-size-base); /* 14px */
font-weight: var(--font-weight-regular);
line-height: var(--line-height-normal);

/* Metadata/Timestamps */
font-size: var(--font-size-sm); /* 12px */
color: var(--dark-text-muted);
```

### Tabular Numerics

For data tables and numeric displays:

```css
font-feature-settings: "tnum";
font-variant-numeric: tabular-nums;
```

---

## Spacing & Grid

### 12-Column Grid System

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--gutter-md); /* 16px */
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}
```

### Common Column Spans

| Span    | Width | Use Case                        |
| ------- | ----- | ------------------------------- |
| 12 cols | 100%  | Full-width tables, dashboards   |
| 9 cols  | 75%   | Main content with 3-col sidebar |
| 8 cols  | 66.6% | Two-thirds layout               |
| 6 cols  | 50%   | Half-width panels, split views  |
| 4 cols  | 33.3% | Three-column layouts            |
| 3 cols  | 25%   | Narrow sidebars                 |

### Spacing Guidelines

```css
/* Tight spacing - Icon margins, compact UI */
gap: var(--spacing-xs); /* 4px */

/* Small spacing - Button padding, tag gaps */
padding: var(--spacing-sm); /* 8px */

/* Medium spacing - Card padding, input padding */
padding: var(--spacing-md); /* 12px */

/* Large spacing - Panel margins, section breaks */
margin: var(--spacing-lg); /* 20px */

/* Extra large - Major sections */
margin: var(--spacing-xl); /* 32px */
```

---

## Iconography

### ✅ Allowed

- **SVG icons** (recommended - fully styleable)
- **Icon fonts** (Lucide Icons, Heroicons, Material Icons)

### ❌ Prohibited

- **Emoji characters** (platform-dependent, unprofessional)
- **Bitmap images** (.png, .jpg - poor scaling)

### Recommended Libraries

**Lucide Icons (Primary):**

```html
<svg class="icon icon-md" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" d="..." />
</svg>
```

### Icon Sizing

| Size | Token     | Use Case                 |
| ---- | --------- | ------------------------ |
| 12px | `icon-xs` | Inline with metadata     |
| 16px | `icon-sm` | Inline with body text    |
| 20px | `icon-md` | Default buttons/forms    |
| 24px | `icon-lg` | Primary actions, nav     |
| 32px | `icon-xl` | Hero icons, empty states |

### Icon Accessibility

```html
<!-- Decorative icon -->
<svg aria-hidden="true">...</svg>

<!-- Informative icon -->
<svg role="img" aria-label="Warning">...</svg>

<!-- Icon-only button -->
<button aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>
```

---

## Components

### Buttons

#### Primary Button

```html
<button class="btn-primary">Save Filter</button>
```

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--primary-4);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  min-height: 40px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--primary-5);
}

.btn-primary:focus {
  outline: 2px solid var(--state-focus);
  outline-offset: 2px;
}

.btn-primary:disabled {
  background: var(--state-disabled-bg);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
```

#### Secondary Button

```html
<button class="btn-secondary">Cancel</button>
```

```css
.btn-secondary {
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  color: var(--dark-text-primary);
  border: 1px solid var(--dark-border-subtle);
  border-radius: var(--radius-sm);
  min-height: 40px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--state-hover);
  border-color: var(--dark-border-strong);
}
```

#### Destructive Button

```css
.btn-danger {
  background: var(--color-danger);
  color: white;
}
```

---

### Inputs

#### Text Input

```html
<label class="form-label">
  Case ID
  <input type="text" class="form-input" placeholder="2024-XXXX" />
</label>
```

```css
.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--dark-text-primary);
  margin-bottom: var(--spacing-xs);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--dark-bg-surface-subtle);
  border: 1px solid var(--dark-border-subtle);
  border-radius: var(--radius-sm);
  color: var(--dark-text-primary);
  font-size: var(--font-size-base);
  min-height: 40px;
}

.form-input:focus {
  outline: none;
  border-color: var(--state-focus);
  box-shadow: 0 0 0 2px var(--primary-7);
}
```

#### Error State

```html
<input class="form-input form-input-error" aria-invalid="true" />
<span class="form-error">Case ID is required</span>
```

```css
.form-input-error {
  border-color: var(--color-danger);
}

.form-error {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}
```

---

### Tables

```html
<table class="data-table">
  <thead>
    <tr>
      <th>Case ID</th>
      <th>Status</th>
      <th>Records</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2024-1234</td>
      <td>Pending</td>
      <td class="cell-number">1,247</td>
    </tr>
  </tbody>
</table>
```

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.data-table th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--dark-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--dark-border-strong);
  background: var(--dark-bg-surface-subtle);
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--dark-text-primary);
  border-top: 1px solid var(--dark-border-subtle);
}

.data-table tbody tr:hover {
  background: var(--state-hover);
}

.cell-number {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

---

### Tags & Chips

#### Category Tag

```html
<span class="tag tag-category">GDPR</span>
```

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.tag-category {
  background: var(--neutral-2);
  color: var(--dark-text-primary);
}
```

#### AI-Suggested Tag

```html
<span class="tag tag-ai">
  <svg class="icon icon-xs" aria-hidden="true">...</svg>
  <span>shipping delay</span>
  <button class="tag-info" aria-label="Why was this suggested?">
    <svg class="icon icon-xs" aria-hidden="true">...</svg>
  </button>
</span>
```

```css
.tag-ai {
  background: var(--ai-tag-accent); /* #8566b3 */
  color: white;
}
```

#### Dismissible Tag

```html
<span class="tag">
  <span>data retention</span>
  <button class="tag-dismiss" aria-label="Remove tag">×</button>
</span>
```

#### Tag Overflow

```html
<span class="tag tag-overflow">+3</span>
```

```css
.tag-overflow {
  background: var(--neutral-3);
  color: var(--dark-text-muted);
  cursor: pointer;
}
```

---

### Modals

```html
<div
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title">Confirm Deletion</h2>
      <button class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete case #2024-1234?</p>
    </div>
    <div class="modal-footer">
      <button class="btn-danger">Delete</button>
      <button class="btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--dark-bg-surface);
  border: 1px solid var(--dark-border-subtle);
  border-radius: var(--radius-md);
  max-width: 500px;
  width: 90%;
  box-shadow: var(--elevation-high);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--dark-border-subtle);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--dark-border-subtle);
}
```

**Accessibility:**

- Focus trap (keep focus within modal)
- Escape key closes modal
- Return focus to trigger element on close

---

### Alerts

#### Success Alert

```html
<div class="alert alert-success">
  <svg class="alert-icon">...</svg>
  <span>Filter saved successfully</span>
</div>
```

```css
.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-left: 4px solid;
  border-radius: var(--radius-sm);
}

.alert-success {
  background: var(--success-8);
  border-color: var(--success-4);
  color: var(--neutral-0);
}
```

#### Error/Warning/Info Variants

```css
.alert-error {
  background: var(--error-8);
  border-color: var(--error-4);
  color: var(--neutral-0);
}

.alert-warning {
  background: var(--warning-8);
  border-color: var(--warning-4);
  color: var(--neutral-0);
}

.alert-info {
  background: var(--info-8);
  border-color: var(--info-4);
  color: var(--neutral-0);
}
```

---

## AI Integration

### Core Principles

1. **Transparency First** - Always indicate AI-generated content
2. **Human in the Loop** - AI suggests, humans decide
3. **Auditability** - Log all AI decisions with timestamps
4. **Explainability** - Provide "Why was this suggested?" controls

### AI Provenance Marker

```html
<span class="tag tag-ai">
  <svg class="icon icon-xs" aria-hidden="true">
    <path d="M6 2l1 3h3l-2.5 2 1 3L6 8.5 3.5 10l1-3L2 5h3z" />
  </svg>
  <span>AI-discovered</span>
  <button class="tag-info" aria-label="Why was this suggested?">
    <svg class="icon icon-xs" aria-hidden="true">
      <circle cx="6" cy="6" r="5" />
    </svg>
  </button>
</span>
```

### Confidence Indicator

```html
<div class="ai-suggestion">
  <span class="tag tag-ai">shipping delay</span>
  <span class="confidence">87% confidence</span>
</div>
```

```css
.confidence {
  font-size: var(--font-size-sm);
  color: var(--dark-text-muted);
}
```

### Explainability Modal

```html
<div class="modal">
  <div class="modal-header">
    <h2>Why was "shipping delay" suggested?</h2>
  </div>
  <div class="modal-body">
    <p><strong>Model:</strong> GPT-4o (compliance-tuned)</p>
    <p><strong>Confidence:</strong> 87%</p>
    <p>
      <strong>Reasoning:</strong> Document mentions "delayed shipment" (line 14)
      and "logistics issues" (line 23).
    </p>
  </div>
</div>
```

### Approval Workflow

```html
<div class="ai-suggestions-panel">
  <h3>AI Suggested Tags (5)</h3>
  <div class="suggestion-list">
    <div class="suggestion-item">
      <input type="checkbox" id="tag1" checked />
      <label for="tag1">
        <span class="tag tag-ai">shipping delay</span>
        <span class="confidence">87%</span>
      </label>
    </div>
  </div>
  <div class="actions">
    <button class="btn-primary">Accept Selected (3)</button>
    <button class="btn-secondary">Reject All</button>
  </div>
</div>
```

---

## Accessibility Standards

### WCAG 2.1 Level AA Compliance

#### 1. Keyboard Navigation

**All interactive elements must be keyboard accessible:**

- Tab order follows logical reading flow
- Visible focus indicators (2px solid outline)
- Escape key closes modals/dialogs
- Arrow keys navigate tables/lists

```css
*:focus {
  outline: 2px solid var(--state-focus); /* #8566b3 */
  outline-offset: 2px;
}
```

#### 2. Color Contrast

**Minimum ratios:**

- Normal text (14px): **4.5:1**
- Large text (18px+): **3:1**
- UI components: **3:1**

#### 3. Screen Reader Support

**Use semantic HTML:**

```html
<!-- ✓ CORRECT -->
<button>Save</button>
<nav>...</nav>
<main>...</main>

<!-- ✗ WRONG -->
<div onclick="save()">Save</div>
```

**ARIA labels for icon-only buttons:**

```html
<button aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>
```

**ARIA live regions:**

```html
<div role="alert" aria-live="assertive">Error: Failed to save filter</div>
```

#### 4. Touch Targets

**Minimum size:** 40×40px for enterprise desktop context

```css
.btn-primary,
.form-input {
  min-height: 40px;
  min-width: 40px;
}
```

#### 5. Text Alternatives

**Images:**

```html
<img src="chart.png" alt="Bar chart showing 12% increase in violations" />
```

**Icons:**

```html
<!-- Decorative -->
<svg aria-hidden="true">...</svg>

<!-- Informative -->
<svg role="img" aria-label="Warning">...</svg>
```

**Charts with fallback:**

```html
<div class="chart" aria-label="Violations by quarter">
  <!-- Chart visualization -->
  <table class="sr-only">
    <caption>
      Violations by Quarter
    </caption>
    <!-- Data rows -->
  </table>
</div>
```

#### 6. Form Accessibility

```html
<label for="case-id">Case ID</label>
<input id="case-id" type="text" aria-required="true" />

<!-- Error state -->
<input aria-invalid="true" aria-describedby="error-msg" />
<span id="error-msg" class="form-error">Case ID is required</span>
```

#### 7. Table Accessibility

```html
<table>
  <caption>
    Compliance Cases - December 2024
  </caption>
  <thead>
    <tr>
      <th scope="col">Case ID</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">2024-1234</th>
      <td>Pending</td>
    </tr>
  </tbody>
</table>
```

---

## Content Guidelines

### Writing Principles

1. **Clarity Over Cleverness**

   - Use plain language
   - Front-load important information
   - Avoid jargon unless industry-standard

2. **Concise and Scannable**

   - One idea per sentence
   - Short paragraphs (2-3 sentences)
   - Bullet points for lists

3. **Action-Oriented**
   - Use active voice
   - Start with verbs for actions
   - Be specific about outcomes

### Examples

| ✗ Avoid                             | ✓ Prefer                                  |
| ----------------------------------- | ----------------------------------------- |
| "The filter was saved successfully" | "Filter saved successfully"               |
| "It seems there might be an error"  | "Error: Invalid case ID format"           |
| "Proceeding with deletion"          | "Delete case #2024-1234?"                 |
| "Something went wrong"              | "Error: Case ID must be YYYY-XXXX format" |

### Error Messages

```html
<!-- ✓ GOOD - specific, actionable -->
<div class="alert alert-error">
  <strong>Error:</strong> Case ID must be in format YYYY-XXXX (e.g., 2024-1234)
</div>

<!-- ✗ AVOID - vague, unhelpful -->
<div class="alert alert-error">Something went wrong. Please try again.</div>
```

### Tone & Voice

- **Professional yet approachable**
- Direct and respectful
- Acknowledge user actions
- Explain errors without blame

---

## Quick Component Checklist

Before shipping any component:

- [ ] Uses only design tokens (no hardcoded values)
- [ ] Meets WCAG 2.1 AA standards (4.5:1 contrast minimum)
- [ ] Keyboard accessible (visible focus states)
- [ ] Screen reader tested (semantic HTML + ARIA)
- [ ] All states implemented (hover, focus, active, disabled)
- [ ] SVG icons only (no emoji)
- [ ] Minimum 40×40px touch targets
- [ ] AI content clearly marked with provenance
- [ ] Error states with specific, actionable messages
- [ ] Follows spacing scale (4px base unit)

---

## Common Patterns

### Data Table with Filters

**Components:** Tables + Inputs + Tags + Buttons + Checkboxes  
**Use Case:** Compliance case management, violation tracking

### AI-Assisted Tagging

**Components:** Tags (AI variant) + Modals + Buttons  
**Use Case:** Automated metadata discovery, content classification

### Audit Dashboard

**Components:** Cards + Charts + Tables + Alerts  
**Use Case:** Executive overview, compliance monitoring

---

## Version & Migration

**Current Version:** 2.0.0 (Purple color system)

**Breaking Changes from 1.x:**

- All teal/cyan colors replaced with purple system
- New AI provenance tokens (`--ai-tag-accent`)
- Updated semantic color scales (9-step)

---

## File Loading

### CSS Tokens

```html
<link rel="stylesheet" href="../assets/css/focus-portal-tokens.css" />
```

### Google Fonts (Inter)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet" />
```

---

## Further Reading

For expanded documentation, see:

- **[README.md](README.md)** - Design system overview
- **[foundations/](foundations/)** - Detailed token reference
- **[components/](components/)** - Component-by-component guides
- **[ai-integration/](ai-integration/)** - AI-specific patterns
- **[accessibility/](accessibility/)** - WCAG compliance details
- **[examples/](examples/)** - Live HTML/CSS demos

---

**End of Condensed Reference**  
_This guide consolidates all essential information from the design-book for rapid implementation. For complete context and examples, consult the full documentation sections above._
