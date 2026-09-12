# Spotify Liked Songs Transferrer - Hybrid Web & Electron Plan

This plan outlines the architecture for a dual-mode application (Express web server and Electron desktop application) that transfers Spotify Liked Songs between two accounts. The desktop app compiles into a Windows installer (`.exe`) via `electron-builder`.

## User Review Required

> [!IMPORTANT]
> **Spotify Developer Dashboard Setup**
> Register an app at the [Spotify Developer Dashboard](https://developer.spotify.com/) and configure:
> - Client ID & Client Secret (placed in `.env` or entered in-app).
> - Redirect URI: `http://localhost:3000/api/auth/callback`
> - Whitelist users: Both Account A and Account B must be whitelisted under "Users and Access".

> [!IMPORTANT]
> **Hybrid Electron Architecture**
> To share 100% of the frontend and OAuth callback code, the Electron desktop app will start the Express backend locally on `localhost:3000` inside its main process. The Electron window will then load `http://localhost:3000`. This allows the Spotify redirect callbacks to function identically on both web and desktop.

> [!WARNING]
> **Multi-Account Session Collision**
> Spotify's cookie-based authentication makes it easy to accidentally authenticate the same account twice. 
> Our app will:
> 1. Use the `show_dialog=true` parameter in Spotify's OAuth request to force the login/consent screen.
> 2. Provide visual prompts and direct links directing the user to log out of Spotify in a separate tab (`https://accounts.spotify.com/en/logout`) before connecting the Destination Account.
> 3. Store tokens in separate variables (`sourceToken` and `destToken`) in `sessionStorage`.

## Open Questions

> [!NOTE]
> * **Desktop App .env Configuration**: In a production-built Electron app, the `.env` file should be placed in the same folder as the installed executable (or we can load it from the user's home directory). We will configure the backend to check for `.env` in both the project root and the app's executable directory.

---

## Proposed Changes

### Configuration & Desktop Wrapper

#### [NEW] [package.json](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/package.json)
- Minimal configuration with dependencies: `express`, `dotenv`.
- DevDependencies: `electron`, `electron-builder`.
- Build configuration for Windows installer: NSIS target (`.exe` with setup wizard, options for desktop shortcut, install directory).
- Scripts:
  - `npm start`: Runs the standalone web server (`node server.js`).
  - `npm run electron-dev`: Runs the Electron app in development.
  - `npm run build`: Uses `electron-builder` to package the app into a Windows installer `.exe`.

#### [NEW] [.env](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/.env)
- Environment variables template for `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `PORT` (defaults to 3000).

#### [NEW] [main.js](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/main.js)
- Electron main process entry point.
- Starts the Express backend (`server.js`) on app startup.
- Creates a `BrowserWindow` with custom dimensions, removing default window menus for a premium app feel.
- Loads `http://localhost:3000` (or configured port) after the server starts.
- Handles app termination, ensuring the Express backend process/port is closed cleanly.

#### [NEW] [server.js](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/server.js)
- Express server that serves static files from `/public`.
- `/api/auth/login?type=source|destination` redirect route.
- `/api/auth/callback` token exchange route: exchanges `code` for tokens and redirects back to `/index.html?token=...&type=...`.
- Programmatic exporter so it can be cleanly loaded by Electron's `main.js`.

---

### Frontend (HTML / CSS / JS)
A premium client-side experience inspired by TuneMyMusic.

#### [NEW] [index.html](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/public/index.html)
- Modern layout with responsive sidebar/progress tracker.
- Glassmorphic wizard panels (Connect Source, Connect Destination, Review & Transfer, Active Transfer, Success screen).
- Inter / Outfit typography and FontAwesome icon integrations.

#### [NEW] [style.css](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/public/style.css)
- Sleek dark theme (charcoal, slate, and soft muted highlights) with a blurred Unsplash background overlay.
- Glassmorphic panels using `backdrop-filter: blur(16px)` and subtle borders.
- Fluid micro-animations: soft fade-ins, smooth card transitions, elegant spinners, and linear progress indicators.

#### [NEW] [app.js](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/public/app.js)
- Core workflow router matching URL query parameters to retrieve tokens and step states.
- **Extraction Logic:** Paginated fetch from `GET https://api.spotify.com/v1/me/tracks?limit=50&offset=...`.
- **Insertion Logic:** Batching list into chunks of 50 and making sequential `PUT https://api.spotify.com/v1/me/tracks` requests to Account B.
- **Robust Error Handling:** Checks for HTTP 429 (Too Many Requests), parses the `Retry-After` header, pauses operations, and resumes transfer. Updates UI logs in real-time.

#### [NEW] [README.md](file:///c:/Users/yaogl/OneDrive/桌面/spotifytransferrer/README.md)
- Explains how to register the app on Spotify, set up `.env`, install packages, start in web/desktop modes, and build the installer `.exe`.

---

## Verification Plan

### Automated/Manual Verification
1. **Developer Dashboard Configuration**: Verify backend starts and reads credentials.
2. **OAuth Flow & Session Swapping**: 
   - Connect Account A, verify it fetches Liked Songs.
   - Click Spotify Logout link, log in as Account B, verify Account B connects successfully.
3. **Pagination & Chunking**: 
   - Verify pagination functions by pulling >50 Liked Songs (if available).
   - Verify chunking inserts tracks in blocks of 50.
4. **429 Rate Limiting**: Mock or simulate rate-limiting response to confirm the retry and resume behavior.
5. **Electron Packager**: Run `npm run build` and verify that the output directory contains the installer `.exe` and running it launches the wizard and app successfully.
