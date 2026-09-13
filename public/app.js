// ============================================================
// STATE
// ============================================================
let state = {
    sourceToken: sessionStorage.getItem('sourceToken') || null,
    destToken: sessionStorage.getItem('destToken') || null,
    statsToken: sessionStorage.getItem('statsToken') || null,
    sourceUser: JSON.parse(sessionStorage.getItem('sourceUser')) || null,
    destUser: JSON.parse(sessionStorage.getItem('destUser')) || null,
    statsUser: JSON.parse(sessionStorage.getItem('statsUser')) || null,
    sourceTotalTracks: sessionStorage.getItem('sourceTotalTracks') || 0,
    activeTool: sessionStorage.getItem('activeTool') || null,

    // Selection state (step 3)
    transferLikedSongs: true,
    sourcePlaylists: [],         // Full playlist objects from API
    selectedPlaylistIds: new Set(), // IDs of checked playlists
};

// ============================================================
// DOM ELEMENTS
// ============================================================
const elements = {
    landingPage: document.getElementById('landing-page'),
    appContainer: document.getElementById('app-container'),
    statsAppContainer: document.getElementById('stats-app-container'),

    // Transfer — Step 1
    sourceProfile: document.getElementById('source-profile'),
    sourceAvatar: document.getElementById('source-avatar'),
    sourceName: document.getElementById('source-name'),
    sourceCount: document.getElementById('source-count'),
    btnConnectSource: document.getElementById('btn-connect-source'),
    btnNext1: document.getElementById('btn-next-1'),

    // Transfer — Step 2
    destProfile: document.getElementById('dest-profile'),
    destAvatar: document.getElementById('dest-avatar'),
    destName: document.getElementById('dest-name'),
    btnConnectDest: document.getElementById('btn-connect-dest'),
    btnNext2: document.getElementById('btn-next-2'),

    // Transfer — Step 3
    toggleLiked: document.getElementById('toggle-liked'),
    likedSongsCountLabel: document.getElementById('liked-songs-count-label'),
    playlistCountBadge: document.getElementById('playlist-count-badge'),
    playlistListContainer: document.getElementById('playlist-list-container'),
    playlistLoading: document.getElementById('playlist-loading'),

    // Transfer — Step 4
    summarySource: document.getElementById('summary-source'),
    summaryDest: document.getElementById('summary-dest'),
    reviewLikedCount: document.getElementById('review-liked-count'),
    reviewLikedItem: document.getElementById('review-liked-item'),
    reviewPlaylistCount: document.getElementById('review-playlist-count'),
    reviewPlaylistsItem: document.getElementById('review-playlists-item'),
    transferActiveUI: document.getElementById('transfer-active-ui'),
    progressBar: document.getElementById('transfer-progress-bar'),
    statusText: document.getElementById('transfer-status-text'),
    percentageText: document.getElementById('transfer-percentage'),
    logConsole: document.getElementById('log-console'),
    btnStartTransfer: document.getElementById('btn-start-transfer'),
    btnBack4: document.getElementById('btn-back-4'),

    // Transfer — Step 5
    successTracksCount: document.getElementById('success-tracks-count'),
    successPlaylistsMsg: document.getElementById('success-playlists-msg'),

    // Shared
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),

    // Stats
    statsAuthScreen: document.getElementById('stats-auth-screen'),
    statsDashboardView: document.getElementById('stats-dashboard-view'),
    statsAvatar: document.getElementById('stats-avatar'),
    statsUsername: document.getElementById('stats-username'),
    statsLikedCount: document.getElementById('stats-liked-count'),
    statsFollowers: document.getElementById('stats-followers'),
    statsPlayTime: document.getElementById('stats-play-time'),
    topArtistsList: document.getElementById('top-artists-list'),
    topTracksList: document.getElementById('top-tracks-list'),
    jsonUpload: document.getElementById('json-upload')
};

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    checkUrlForTokens();

    if (state.activeTool) {
        startApp(state.activeTool);
    }

    await checkExistingSessions();
    setupJsonUpload();
    setupLikedToggle();
});

// ============================================================
// APP NAVIGATION
// ============================================================
function startApp(toolName) {
    if (!toolName) toolName = 'transfer';
    state.activeTool = toolName;
    sessionStorage.setItem('activeTool', toolName);

    elements.landingPage.classList.remove('active');

    if (toolName === 'transfer') {
        elements.appContainer.classList.remove('hidden');
        elements.statsAppContainer.classList.add('hidden');
    } else if (toolName === 'stats') {
        elements.appContainer.classList.add('hidden');
        elements.statsAppContainer.classList.remove('hidden');
        if (state.statsToken) {
            elements.statsAuthScreen.classList.add('hidden');
            elements.statsDashboardView.classList.remove('hidden');
            loadDashboardStats();
        }
    }
}

function goHome() {
    state.activeTool = null;
    sessionStorage.removeItem('activeTool');
    elements.landingPage.classList.add('active');
    elements.appContainer.classList.add('hidden');
    elements.statsAppContainer.classList.add('hidden');
}

// ============================================================
// URL / TOKEN HANDLING
// ============================================================
function checkUrlForTokens() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    const error = urlParams.get('error');

    if (error) {
        showError(`Authentication error: ${error}`);
        window.history.replaceState({}, document.title, '/');
        return;
    }

    if (token && type) {
        if (type === 'source') {
            sessionStorage.setItem('sourceToken', token);
            state.sourceToken = token;
            state.activeTool = 'transfer';
        } else if (type === 'destination') {
            sessionStorage.setItem('destToken', token);
            state.destToken = token;
            state.activeTool = 'transfer';
        } else if (type === 'stats') {
            sessionStorage.setItem('statsToken', token);
            state.statsToken = token;
            state.activeTool = 'stats';
        }
        sessionStorage.setItem('activeTool', state.activeTool);
        window.history.replaceState({}, document.title, '/');
    }
}

async function checkExistingSessions() {
    if (state.sourceToken && !state.sourceUser) {
        const user = await fetchProfile(state.sourceToken);
        if (user) {
            state.sourceUser = user;
            sessionStorage.setItem('sourceUser', JSON.stringify(user));
        } else {
            showError("Failed to fetch Source profile. Please try connecting again.");
            state.sourceToken = null;
            sessionStorage.removeItem('sourceToken');
        }
    }

    if (state.destToken && !state.destUser) {
        const user = await fetchProfile(state.destToken);
        if (user) {
            state.destUser = user;
            sessionStorage.setItem('destUser', JSON.stringify(user));
        } else {
            showError("Failed to fetch Destination profile. Please try connecting again.");
            state.destToken = null;
            sessionStorage.removeItem('destToken');
        }
    }

    updateUI();
}

// ============================================================
// SPOTIFY API HELPERS
// ============================================================
async function fetchProfile(token) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function fetchTracksCount(token) {
    try {
        const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.total;
    } catch (e) {
        return 0;
    }
}

async function fetchWithRetry(url, options, token, retries = 3) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };

    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, options);

        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
            logMsg(`Rate limited. Waiting ${retryAfter}s...`, 'warning');
            await sleep(retryAfter * 1000);
            continue;
        }

        if (res.status === 403) {
            throw new Error(`HTTP 403 Forbidden: Your second Spotify account is not added to the 'Users and Access' whitelist in your Spotify Developer Dashboard. Please add its email there, then try again.`);
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }
    throw new Error('Max retries exceeded for rate limits.');
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// UI UPDATE (steps 1 & 2)
// ============================================================
async function updateUI() {
    // Step 1
    if (state.sourceUser) {
        elements.sourceName.textContent = state.sourceUser.display_name || 'Spotify User';
        elements.sourceAvatar.src = getAvatarUrl(state.sourceUser);
        elements.sourceProfile.classList.remove('hidden');
        elements.btnConnectSource.classList.add('hidden');
        elements.btnNext1.classList.remove('hidden');

        if (!state.sourceTotalTracks || state.sourceTotalTracks == 0) {
            state.sourceTotalTracks = await fetchTracksCount(state.sourceToken);
            sessionStorage.setItem('sourceTotalTracks', state.sourceTotalTracks);
        }
        elements.sourceCount.textContent = `${state.sourceTotalTracks} liked songs`;

        if (!state.destToken) {
            goToStep(2);
        }
    }

    // Step 2
    if (state.destUser) {
        elements.destName.textContent = state.destUser.display_name || 'Spotify User';
        elements.destAvatar.src = getAvatarUrl(state.destUser);
        elements.destProfile.classList.remove('hidden');
        elements.btnConnectDest.classList.add('hidden');
        elements.btnNext2.classList.remove('hidden');

        if (state.sourceUser && state.destUser) {
            goToStep(3);
        }
    }
}

function getAvatarUrl(user) {
    return (user.images && user.images.length > 0)
        ? user.images[0].url
        : 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021';
}

// ============================================================
// CONNECT ACCOUNT
// ============================================================
function connectAccount(type) {
    if (type === 'destination') {
        const logoutWin = window.open('https://accounts.spotify.com/en/logout', 'Spotify Logout', 'width=700,height=500,top=40,left=40');
        if (logoutWin) {
            setTimeout(() => {
                logoutWin.close();
                window.location.href = `/api/auth/login?type=${type}`;
            }, 2000);
            return;
        } else {
            alert("Please allow popups to automatically switch accounts, or click the logout link above first.");
        }
    }
    window.location.href = `/api/auth/login?type=${type}`;
}

// ============================================================
// WIZARD NAVIGATION
// ============================================================
function goToStep(step) {
    document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-step-${step}`);
    if (panel) panel.classList.add('active');

    // Update sidebar nav steps (only steps 1–4 are in sidebar)
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active', 'completed');
        s.removeAttribute('aria-current');
    });

    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`nav-step-${i}`);
        if (!stepEl) continue;
        if (i < step) {
            stepEl.classList.add('completed');
        } else if (i === step) {
            stepEl.classList.add('active');
            stepEl.setAttribute('aria-current', 'step');
        }
    }

    // Side-effects per step
    if (step === 3) {
        loadSourcePlaylists();
    }
    if (step === 4) {
        populateReviewPanel();
    }
}

// ============================================================
// STEP 3 — LIKED SONGS TOGGLE
// ============================================================
function setupLikedToggle() {
    elements.toggleLiked.addEventListener('change', () => {
        state.transferLikedSongs = elements.toggleLiked.checked;
    });
}

// ============================================================
// STEP 3 — LOAD PLAYLISTS
// ============================================================
async function loadSourcePlaylists() {
    // Only load once
    if (state.sourcePlaylists.length > 0) {
        renderPlaylists();
        updateLikedSongsLabel();
        return;
    }

    // Show loading
    elements.playlistListContainer.innerHTML = '';
    const loadingEl = document.createElement('div');
    loadingEl.className = 'playlist-loading';
    loadingEl.id = 'playlist-loading';
    loadingEl.innerHTML = '<div class="spinner"></div><span>Loading your playlists...</span>';
    elements.playlistListContainer.appendChild(loadingEl);

    try {
        const playlists = [];
        let url = 'https://api.spotify.com/v1/me/playlists?limit=50';

        while (url) {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${state.sourceToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            playlists.push(...data.items.filter(p => p)); // filter nulls
            url = data.next;
        }

        state.sourcePlaylists = playlists;
        // Select all by default
        state.selectedPlaylistIds = new Set(playlists.map(p => p.id));

        updateLikedSongsLabel();
        renderPlaylists();
    } catch (e) {
        elements.playlistListContainer.innerHTML = `<div class="playlist-loading"><span style="color:#f85149">Failed to load playlists: ${e.message}</span></div>`;
    }
}

function updateLikedSongsLabel() {
    elements.likedSongsCountLabel.textContent = state.sourceTotalTracks
        ? `${state.sourceTotalTracks} songs`
        : 'Loading count...';
}

function renderPlaylists() {
    elements.playlistListContainer.innerHTML = '';

    const total = state.sourcePlaylists.length;
    elements.playlistCountBadge.textContent = total;

    if (total === 0) {
        elements.playlistListContainer.innerHTML = '<div class="playlist-loading"><span>No playlists found on this account.</span></div>';
        return;
    }

    state.sourcePlaylists.forEach(playlist => {
        const item = document.createElement('label');
        item.className = 'playlist-item';
        item.setAttribute('for', `pl-${playlist.id}`);

        const isChecked = state.selectedPlaylistIds.has(playlist.id);
        const trackCount = playlist.tracks ? playlist.tracks.total : 0;

        // Thumbnail
        let thumbHtml;
        if (playlist.images && playlist.images.length > 0) {
            thumbHtml = `<img src="${playlist.images[0].url}" class="playlist-thumb" alt="${escapeHtml(playlist.name)} cover" loading="lazy">`;
        } else {
            thumbHtml = `<div class="playlist-thumb-placeholder" aria-hidden="true"><i class="fa-solid fa-music"></i></div>`;
        }

        item.innerHTML = `
            <input type="checkbox" id="pl-${playlist.id}" data-playlist-id="${playlist.id}" ${isChecked ? 'checked' : ''}>
            <div class="custom-checkbox" aria-hidden="true"></div>
            ${thumbHtml}
            <div class="playlist-item-info">
                <div class="playlist-item-name">${escapeHtml(playlist.name)}</div>
                <div class="playlist-item-sub">${trackCount} track${trackCount !== 1 ? 's' : ''}</div>
            </div>
        `;

        item.querySelector('input').addEventListener('change', (e) => {
            const id = e.target.dataset.playlistId;
            if (e.target.checked) {
                state.selectedPlaylistIds.add(id);
            } else {
                state.selectedPlaylistIds.delete(id);
            }
        });

        elements.playlistListContainer.appendChild(item);
    });
}

function selectAllPlaylists(checked) {
    const checkboxes = elements.playlistListContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.playlistId;
        if (checked) {
            state.selectedPlaylistIds.add(id);
        } else {
            state.selectedPlaylistIds.delete(id);
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// STEP 4 — REVIEW PANEL
// ============================================================
function populateReviewPanel() {
    elements.summarySource.textContent = state.sourceUser?.display_name || 'Source';
    elements.summaryDest.textContent = state.destUser?.display_name || 'Destination';

    // Liked Songs
    const likedCount = state.transferLikedSongs ? parseInt(state.sourceTotalTracks) || 0 : 0;
    elements.reviewLikedCount.textContent = likedCount.toLocaleString();
    elements.reviewLikedItem.classList.toggle('dimmed', !state.transferLikedSongs);

    // Playlists
    const playlistCount = state.selectedPlaylistIds.size;
    elements.reviewPlaylistCount.textContent = playlistCount;
    elements.reviewPlaylistsItem.classList.toggle('dimmed', playlistCount === 0);
}

// ============================================================
// TRANSFER LOGIC
// ============================================================
let totalOpsGlobal = 0;
let completedOpsGlobal = 0;

function setProgress(percent) {
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    elements.progressBar.style.width = `${p}%`;
    elements.progressBar.setAttribute('aria-valuenow', p);
    elements.percentageText.textContent = `${p}%`;
}

function updateProgress() {
    const p = totalOpsGlobal > 0 ? (completedOpsGlobal / totalOpsGlobal) * 100 : 0;
    setProgress(p);
}

function logMsg(msg, type = 'info') {
    const p = document.createElement('div');
    p.textContent = `> ${msg}`;
    if (type === 'error') p.classList.add('log-error');
    else if (type === 'success') p.classList.add('log-success');
    else if (type === 'warning') p.classList.add('log-warning');
    elements.logConsole.appendChild(p);
    elements.logConsole.scrollTop = elements.logConsole.scrollHeight;
}

async function startTransfer() {
    if (!state.sourceToken || !state.destToken) return;

    const selectedPlaylists = state.sourcePlaylists.filter(p => state.selectedPlaylistIds.has(p.id));

    if (!state.transferLikedSongs && selectedPlaylists.length === 0) {
        showError("Nothing selected to transfer. Please select Liked Songs or at least one playlist.");
        return;
    }

    // Lock UI
    elements.btnStartTransfer.classList.add('hidden');
    elements.btnBack4.classList.add('hidden');
    elements.transferActiveUI.classList.remove('hidden');
    elements.logConsole.innerHTML = '';

    // Pre-calculate total track operations
    const likedCount = state.transferLikedSongs ? parseInt(state.sourceTotalTracks) || 0 : 0;
    const playlistTrackCounts = selectedPlaylists.map(p => p.tracks?.total || 0);
    const playlistTotal = playlistTrackCounts.reduce((a, b) => a + b, 0);
    totalOpsGlobal = likedCount + playlistTotal;
    completedOpsGlobal = 0;
    setProgress(0);

    let totalTracksTransferred = 0;
    let playlistsTransferred = 0;

    try {
        // ─────────────────────────────────────────
        // PHASE 1 — Liked Songs
        // ─────────────────────────────────────────
        if (state.transferLikedSongs && likedCount > 0) {
            logMsg('Phase 1: Fetching Liked Songs from source...');
            elements.statusText.textContent = 'Fetching Liked Songs...';

            const likedTrackIds = await fetchAllLikedTrackIds();
            logMsg(`Fetched ${likedTrackIds.length} liked tracks.`, 'success');

            elements.statusText.textContent = 'Saving Liked Songs to destination...';
            logMsg('Saving Liked Songs to destination...');

            const chunks = chunkArray(likedTrackIds, 50);
            for (let i = 0; i < chunks.length; i++) {
                await fetchWithRetry(
                    'https://api.spotify.com/v1/me/tracks',
                    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: chunks[i] }) },
                    state.destToken
                );
                completedOpsGlobal += chunks[i].length;
                updateProgress();
                logMsg(`Liked Songs: saved batch ${i + 1}/${chunks.length}`);
            }

            totalTracksTransferred += likedTrackIds.length;
            logMsg(`Liked Songs done — ${likedTrackIds.length} tracks saved.`, 'success');
        } else if (state.transferLikedSongs) {
            logMsg('No liked songs found on source account.', 'warning');
        } else {
            logMsg('Liked Songs skipped (toggle off).', 'info');
        }

        // ─────────────────────────────────────────
        // PHASE 2 — Playlists
        // ─────────────────────────────────────────
        if (selectedPlaylists.length > 0) {
            logMsg(`Phase 2: Transferring ${selectedPlaylists.length} playlist(s)...`);

            for (let pi = 0; pi < selectedPlaylists.length; pi++) {
                const playlist = selectedPlaylists[pi];
                elements.statusText.textContent = `Playlist ${pi + 1}/${selectedPlaylists.length}: ${playlist.name}`;
                logMsg(`▶ Playlist "${playlist.name}" (${playlist.tracks?.total || 0} tracks)...`);

                // 1. Fetch all track URIs from source
                const trackUris = await fetchAllPlaylistTrackUris(playlist.id, state.sourceToken);
                logMsg(`  Fetched ${trackUris.length} tracks from "${playlist.name}".`);

                // 2. Create new playlist on destination
                const newPlaylist = await fetchWithRetry(
                    `https://api.spotify.com/v1/users/${state.destUser.id}/playlists`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: playlist.name,
                            description: playlist.description || `Transferred from ${state.sourceUser.display_name || 'source account'}`,
                            public: false
                        })
                    },
                    state.destToken
                );

                logMsg(`  Created playlist "${newPlaylist.name}" on destination.`);

                // 3. Add tracks in batches of 100 (Spotify limit for playlist adds)
                const uriChunks = chunkArray(trackUris, 100);
                for (let ci = 0; ci < uriChunks.length; ci++) {
                    await fetchWithRetry(
                        `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uris: uriChunks[ci] })
                        },
                        state.destToken
                    );
                    completedOpsGlobal += uriChunks[ci].length;
                    updateProgress();
                }

                totalTracksTransferred += trackUris.length;
                playlistsTransferred++;
                logMsg(`  ✓ Playlist "${playlist.name}" complete.`, 'success');
            }
        } else {
            logMsg('No playlists selected for transfer.', 'info');
        }

        // ─────────────────────────────────────────
        // DONE
        // ─────────────────────────────────────────
        setProgress(100);
        elements.statusText.textContent = 'Transfer Complete!';
        logMsg('All done!', 'success');

        setTimeout(() => {
            elements.successTracksCount.textContent = totalTracksTransferred.toLocaleString();
            elements.successPlaylistsMsg.textContent = playlistsTransferred > 0
                ? `Including ${playlistsTransferred} playlist${playlistsTransferred !== 1 ? 's' : ''} (set to Private on destination).`
                : '';
            goToStep(5);
        }, 1500);

    } catch (e) {
        logMsg(`Error: ${e.message}`, 'error');
        showError(`Transfer failed: ${e.message}`);
        elements.btnStartTransfer.classList.remove('hidden');
        elements.btnStartTransfer.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Transfer';
        elements.btnBack4.classList.remove('hidden');
    }
}

async function fetchAllLikedTrackIds() {
    const ids = [];
    let offset = 0;
    const limit = 50;
    let total = parseInt(state.sourceTotalTracks) || 1;

    while (offset < total) {
        const data = await fetchWithRetry(
            `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
            { method: 'GET' },
            state.sourceToken
        );
        if (data.total > total) total = data.total;
        const trackIds = data.items.map(item => item.track?.id).filter(Boolean);
        ids.push(...trackIds);
        offset += limit;
    }
    return ids;
}

async function fetchAllPlaylistTrackUris(playlistId, token) {
    const uris = [];
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(uri,id))`;

    while (url) {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '3', 10);
            await sleep(retryAfter * 1000);
            continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching playlist tracks`);
        const data = await res.json();
        const validUris = data.items
            .map(item => item.track?.uri)
            .filter(uri => uri && uri.startsWith('spotify:track:'));
        uris.push(...validUris);
        url = data.next;
    }
    return uris;
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function restartApp() {
    sessionStorage.clear();
    window.location.href = '/';
}

// ============================================================
// ERROR TOAST
// ============================================================
function showError(msg) {
    elements.errorMessage.textContent = msg;
    elements.errorToast.classList.remove('hidden');
    setTimeout(() => {
        elements.errorToast.classList.add('hidden');
    }, 6000);
}

// ============================================================
// STATS DASHBOARD LOGIC
// ============================================================
async function loadDashboardStats() {
    try {
        if (!state.statsUser) {
            const user = await fetchProfile(state.statsToken);
            if (user) {
                state.statsUser = user;
                sessionStorage.setItem('statsUser', JSON.stringify(user));
            } else {
                throw new Error("Failed to load user profile");
            }
        }

        elements.statsUsername.textContent = state.statsUser.display_name || 'Spotify User';
        elements.statsAvatar.src = getAvatarUrl(state.statsUser);
        elements.statsFollowers.textContent = state.statsUser.followers
            ? state.statsUser.followers.total.toLocaleString() : '0';

        let totalTracks = await fetchTracksCount(state.statsToken);
        elements.statsLikedCount.textContent = totalTracks.toLocaleString();

        const topArtists = await fetchTopData('artists', state.statsToken);
        elements.topArtistsList.innerHTML = '';
        if (topArtists && topArtists.items) {
            const genreCounts = {};
            topArtists.items.forEach(artist => {
                artist.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
            });
            const sortedGenres = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

            const genreContainer = document.getElementById('top-genres-list');
            if (genreContainer) {
                genreContainer.innerHTML = sortedGenres.map(g => `<div class="genre-badge">${g}</div>`).join('');
            }

            topArtists.items.slice(0, 10).forEach((artist, index) => {
                const li = document.createElement('li');
                li.className = 'top-item';
                const imgUrl = artist.images?.length > 0 ? artist.images[0].url : getAvatarUrl({});
                li.innerHTML = `
                    <span class="top-item-rank">#${index + 1}</span>
                    <img src="${imgUrl}" class="top-item-img" alt="${escapeHtml(artist.name)}">
                    <div class="top-item-info">
                        <div class="top-item-name">${escapeHtml(artist.name)}</div>
                        <div class="top-item-sub">Genres: ${artist.genres.slice(0, 2).join(', ')}</div>
                    </div>
                `;
                elements.topArtistsList.appendChild(li);
            });
        }

        const topTracks = await fetchTopData('tracks', state.statsToken);
        elements.topTracksList.innerHTML = '';
        if (topTracks && topTracks.items) {
            const trackIds = topTracks.items.map(t => t.id).join(',');
            const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
                headers: { 'Authorization': `Bearer ${state.statsToken}` }
            });
            if (featuresRes.ok) {
                const featuresData = await featuresRes.json();
                if (featuresData.audio_features) {
                    let totalDance = 0, totalEnergy = 0, totalValence = 0, count = 0;
                    featuresData.audio_features.forEach(f => {
                        if (f) { totalDance += f.danceability; totalEnergy += f.energy; totalValence += f.valence; count++; }
                    });
                    if (count > 0) {
                        const avgDance = Math.round((totalDance / count) * 100);
                        const avgEnergy = Math.round((totalEnergy / count) * 100);
                        const avgValence = Math.round((totalValence / count) * 100);
                        document.getElementById('vibe-dance').textContent = `${avgDance}%`;
                        document.getElementById('vibe-bar-dance').style.width = `${avgDance}%`;
                        document.getElementById('vibe-energy').textContent = `${avgEnergy}%`;
                        document.getElementById('vibe-bar-energy').style.width = `${avgEnergy}%`;
                        document.getElementById('vibe-valence').textContent = `${avgValence}%`;
                        document.getElementById('vibe-bar-valence').style.width = `${avgValence}%`;
                    }
                }
            }

            topTracks.items.slice(0, 10).forEach((track, index) => {
                const li = document.createElement('li');
                li.className = 'top-item';
                const imgUrl = track.album.images?.length > 0 ? track.album.images[0].url : getAvatarUrl({});
                li.innerHTML = `
                    <span class="top-item-rank">#${index + 1}</span>
                    <img src="${imgUrl}" class="top-item-img" alt="${escapeHtml(track.name)}">
                    <div class="top-item-info">
                        <div class="top-item-name">${escapeHtml(track.name)}</div>
                        <div class="top-item-sub">${track.artists.map(a => escapeHtml(a.name)).join(', ')}</div>
                    </div>
                `;
                elements.topTracksList.appendChild(li);
            });
        }
    } catch (e) {
        showError("Failed to load dashboard: " + e.message);
    }
}

async function fetchTopData(type, token) {
    try {
        const res = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=long_term&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

// ============================================================
// JSON UPLOAD — PLAY TIME
// ============================================================
function setupJsonUpload() {
    elements.jsonUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonArray = JSON.parse(event.target.result);
                calculatePlayTime(jsonArray);
            } catch (err) {
                showError("Invalid JSON file. Please upload a valid Spotify StreamingHistory.json file.");
            }
        };
        reader.readAsText(file);
    });
}

function calculatePlayTime(jsonArray) {
    if (!Array.isArray(jsonArray)) {
        showError("The JSON file must contain an array of streaming history.");
        return;
    }
    let totalMs = 0;
    for (const item of jsonArray) {
        if (typeof item.msPlayed === 'number') totalMs += item.msPlayed;
        else if (typeof item.ms_played === 'number') totalMs += item.ms_played;
    }
    if (totalMs === 0) {
        showError("Could not find any play time data in this file. Are you sure it's StreamingHistory.json?");
        return;
    }
    const totalMinutes = Math.floor(totalMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    elements.statsPlayTime.textContent = totalHours > 0
        ? `${totalHours.toLocaleString()} hrs`
        : `${totalMinutes.toLocaleString()} mins`;
}

// ============================================================
// PDF DOWNLOAD
// ============================================================
function downloadPDF() {
    const element = document.getElementById('dashboard-content');
    const opt = {
        margin: 10,
        filename: 'Spotify_Life_Stats.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().catch(err => {
        console.error("PDF generation error", err);
        showError("Failed to generate PDF. Make sure your browser allows it.");
    });
}
