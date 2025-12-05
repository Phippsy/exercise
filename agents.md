# Agent Instructions for Workout Tracker

## Cache Busting for JavaScript and CSS

### Why This Matters

When deploying updates to GitHub Pages (or any static hosting), browsers—especially Safari and iOS home screen apps—aggressively cache static files like `app.js` and `styles.css`. This can cause users to run old versions of the app even after you've pushed new code.

To solve this, we use **versioned URLs** (query parameter cache busting) so that each deployment is treated as a new resource by the browser.

### How It Works

In `index.html`, the JavaScript and CSS files are loaded with version query parameters:

```html
<link rel="stylesheet" href="styles.css?v=1.0.0" />
<script src="app.js?v=1.0.0"></script>
```

The `?v=1.0.0` portion makes the URL unique. When you change this version number, browsers treat it as a completely new file and fetch it fresh.

### CRITICAL: Increment Version on Every Deploy

**Whenever you make changes to `app.js` or `styles.css`, you MUST increment the version number in `index.html`.**

#### Version Numbering Convention

Use semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** (e.g., 1.x.x → 2.x.x): Breaking changes or major new features
- **MINOR** (e.g., 1.0.x → 1.1.x): New features, non-breaking changes
- **PATCH** (e.g., 1.0.0 → 1.0.1): Bug fixes, minor tweaks

Examples:

- Bug fix in weight validation → `1.0.0` → `1.0.1`
- New feature: muscle badges → `1.0.1` → `1.1.0`
- Complete UI overhaul → `1.1.0` → `2.0.0`

#### Steps for Every Code Change

1. Make your changes to `app.js` and/or `styles.css`
2. Open `index.html`
3. Find both version parameters:
   - `<link rel="stylesheet" href="styles.css?v=X.X.X" />`
   - `<script src="app.js?v=X.X.X"></script>`
4. Increment the version appropriately
5. Commit and deploy

### Current Version

**Current Version: 1.0.2** (as of 2025-12-05)

- 1.0.2: Made exercise highlight persistent until user takes new action
- 1.0.1: Added visual highlight feedback when exercises are reordered
- 1.0.0: Initial versioned release

### Quick Reference

| Change Type  | Example                       | Version Update       |
| ------------ | ----------------------------- | -------------------- |
| Bug fix      | Fixed weight field validation | PATCH: 1.0.0 → 1.0.1 |
| New feature  | Added muscle group badges     | MINOR: 1.0.1 → 1.1.0 |
| Major update | Redesigned entire UI          | MAJOR: 1.1.0 → 2.0.0 |

---

**Remember:** If users report seeing old behavior after a deploy, the version number likely wasn't incremented!
