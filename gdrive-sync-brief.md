# Google Drive Sync — Technical Implementation Brief

How Mixtastic stores and syncs JSON data to Google Drive from a client-side SPA (no backend required).

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Browser (SPA)                      │
│                                     │
│  localStorage ←→ App State          │
│       ↕                             │
│  googleDrive.ts                     │
│       ↕                             │
│  Google Identity Services (GIS)     │
│       ↕                             │
│  Google Drive REST API v3           │
│  (single JSON file in user's Drive) │
└─────────────────────────────────────┘
```

There is **no backend**. The browser directly authenticates with Google and calls the Drive API. All data lives in the user's own Google Drive as a single JSON file.

---

## 1. Google Cloud Console Setup

### Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (type: **Web application**)
3. Under **Authorized JavaScript origins**, add:
   - Your production URL (e.g. `https://yourdomain.com`)
   - `http://localhost:5173` (for local dev with Vite)
4. Enable the **Google Drive API** in the [API Library](https://console.cloud.google.com/apis/library/drive.googleapis.com)

### OAuth Consent Screen

- Set to **External** (or Internal if in a Workspace org)
- You only need the scope `https://www.googleapis.com/auth/drive.file`
- This scope only grants access to files **created by your app** — it cannot see the user's other Drive files
- The 100-user limit for unverified apps is fine for personal/small-team use

### Client ID Storage

The Client ID is **not baked into the build** — the user enters it in the app UI and it's stored in `localStorage`. This means:

- No secrets in source code
- Different users/deployments can use different Google Cloud projects
- The Client ID is a public identifier (not a secret), so localStorage is fine

---

## 2. Loading the GIS Library

Add the Google Identity Services script to your `index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

Since it loads async, poll for availability in your component:

```typescript
useEffect(() => {
  if (typeof google !== "undefined" && google.accounts?.oauth2) {
    setGisLoaded(true);
    return;
  }
  const timer = setInterval(() => {
    if (typeof google !== "undefined" && google.accounts?.oauth2) {
      setGisLoaded(true);
      clearInterval(timer);
    }
  }, 500);
  return () => clearInterval(timer);
}, []);
```

### TypeScript Declarations

GIS doesn't ship types. Create a `google.d.ts` file:

```typescript
declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    error_callback: (error: { type: string; message: string }) => void;
    requestAccessToken(overrideConfig?: { prompt?: string }): void;
  }

  interface TokenResponse {
    access_token: string;
    error?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }

  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }): TokenClient;

  function revoke(token: string, callback?: () => void): void;
}
```

---

## 3. Authentication Flow

### Initialisation

Create a token client once you have a client ID and GIS is loaded:

```typescript
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

function init(clientId: string) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {}, // overridden per-call in signIn()
  });
}
```

### Sign-in (get an access token)

GIS uses a popup flow. Wrap `requestAccessToken` in a Promise:

```typescript
function signIn(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google auth not initialised"));
      return;
    }
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      accessToken = resp.access_token;
      resolve();
    };
    tokenClient.error_callback = (err) => {
      reject(new Error(err.message || err.type || "Sign-in cancelled"));
    };
    // prompt: '' — silently reuse existing consent if available
    tokenClient.requestAccessToken({ prompt: "" });
  });
}
```

### Sign-out

```typescript
function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
  }
}
```

**Note:** The access token lives only in memory (not localStorage). When the user refreshes, they need to sign in again. This is intentional — access tokens are short-lived (~1 hour) and shouldn't be persisted.

---

## 4. Drive API Operations

All Drive calls go through a helper that injects the Bearer token and handles 401 (expired):

```typescript
async function driveRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!accessToken) throw new Error("Not signed in");
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (resp.status === 401) {
    accessToken = null;
    throw new Error("Session expired. Please sign in again.");
  }
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Drive API error (${resp.status}): ${body}`);
  }
  return resp;
}
```

### Constants

```typescript
const FILE_NAME = "your-app-data.json";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
```

### Find the data file

Since we use `drive.file` scope, we can only see files our app created. Search by name:

```typescript
interface DriveFileInfo {
  id: string;
  modifiedTime: string;
}

async function findFile(): Promise<DriveFileInfo | null> {
  const q = encodeURIComponent(
    `name='${FILE_NAME}' and mimeType='application/json' and trashed=false`,
  );
  const resp = await driveRequest(
    `${DRIVE_FILES_URL}?q=${q}&fields=files(id,modifiedTime)&spaces=drive`,
  );
  const data = await resp.json();
  const file = data.files?.[0];
  return file ? { id: file.id, modifiedTime: file.modifiedTime } : null;
}
```

### Upload (Push)

Two paths: **update** an existing file, or **create** a new one.

**Updating** an existing file is simple — PATCH with the media:

```typescript
await driveRequest(`${DRIVE_UPLOAD_URL}/${file.id}?uploadType=media`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: jsonData,
});
```

**Creating** a new file requires a multipart upload (metadata + content):

```typescript
const metadata = JSON.stringify({
  name: FILE_NAME,
  mimeType: "application/json",
});
const boundary = "---your-app-boundary";
const body = [
  `--${boundary}`,
  "Content-Type: application/json; charset=UTF-8",
  "",
  metadata,
  `--${boundary}`,
  "Content-Type: application/json",
  "",
  jsonData,
  `--${boundary}--`,
].join("\r\n");

await driveRequest(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
  method: "POST",
  headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
  body,
});
```

### Download (Pull)

Fetch the file content with `?alt=media`:

```typescript
async function downloadData(): Promise<YourDataType | null> {
  const file = await findFile();
  if (!file) return null;

  const resp = await driveRequest(`${DRIVE_FILES_URL}/${file.id}?alt=media`);
  const data = await resp.json();
  return data;
}
```

---

## 5. Data Format

Wrap your data in a versioned envelope so you can handle format changes:

```typescript
interface ExportData {
  version: 1;
  exportedAt: string;
  sets: YourDataType[];
}
```

On download, check the version and handle legacy formats:

```typescript
if (data.version === 1 && Array.isArray(data.sets)) {
  return data.sets;
} else if (Array.isArray(data)) {
  // Legacy: plain array format
  return data;
} else {
  throw new Error("Unrecognised data format");
}
```

---

## 6. Conflict Detection

Track push/pull timestamps in localStorage:

```typescript
const LAST_PUSH_KEY = "your-app-last-push";
const LAST_PULL_KEY = "your-app-last-pull";

// After a successful push:
localStorage.setItem(LAST_PUSH_KEY, new Date().toISOString());

// After a successful pull:
localStorage.setItem(LAST_PULL_KEY, new Date().toISOString());
```

Before pushing, compare the remote file's `modifiedTime` against your last push timestamp. If the remote is newer, another device may have pushed — warn the user:

```typescript
if (remoteInfo && lastPush) {
  const remoteTime = new Date(remoteInfo.modifiedTime).getTime();
  const pushTime = new Date(lastPush).getTime();
  if (remoteTime > pushTime) {
    if (!confirm("Remote data was modified since your last push. Overwrite?"))
      return;
  }
}
```

This is a **simple last-writer-wins model** with a human safety net. It doesn't do automatic merging — the user explicitly chooses Push or Pull.

---

## 7. UI Flow

The sync UI has three states:

### State 1: No Client ID configured

Show a "Set Up Google Drive" button → setup wizard with numbered steps → text input for the Client ID.

### State 2: Client ID saved, not signed in

Show a "Sign in with Google" button. On click → GIS popup → user authorises → access token obtained.

### State 3: Signed in

Show two buttons:

- **Push to Drive** (↑) — uploads local data, replaces remote file
- **Pull from Drive** (↓) — downloads remote data, replaces local data (with confirmation)

Plus a status bar showing local/remote set counts and last push/pull timestamps.

---

## 8. File Summary

To transfer this to another project, you need:

| File             | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `google.d.ts`    | TypeScript declarations for GIS          |
| `googleDrive.ts` | Auth + Drive API module (~250 lines)     |
| `index.html`     | Add the GIS `<script>` tag               |
| Component        | UI for setup, sign-in, push/pull buttons |

### What to customise:

- `FILE_NAME` — the name of the JSON file in Drive
- `ExportData` type — your data shape
- `CLIENT_ID_KEY`, `LAST_PUSH_KEY`, `LAST_PULL_KEY` — localStorage key names
- The upload/download functions to match your data model

---

## 9. Key Design Decisions

1. **`drive.file` scope, not `drive`** — the app can only access files it created, not the user's entire Drive. This avoids the more invasive "sensitive scope" review process.

2. **No backend** — the browser talks directly to Google. No server to maintain, no CORS proxies, no token relay.

3. **Client ID in localStorage, not env vars** — allows anyone to deploy the same code with their own Google Cloud project.

4. **Access token in memory only** — tokens expire in ~1 hour. Re-auth is quick (silent if consent was already granted via `prompt: ''`).

5. **Manual push/pull, not auto-sync** — simpler mental model, no merge conflicts. The user controls when data moves.

6. **Single JSON file** — all app data in one file. Simple to reason about. Works well up to a few MB (Drive API limit for simple upload is 5MB; multipart is 5TB but realistically JSON stays small).
