// State
let state = {
    sourceToken: sessionStorage.getItem('sourceToken') || null,
    destToken: sessionStorage.getItem('destToken') || null,
    statsToken: sessionStorage.getItem('statsToken') || null,
    sourceUser: JSON.parse(sessionStorage.getItem('sourceUser')) || null,
    destUser: JSON.parse(sessionStorage.getItem('destUser')) || null,
    statsUser: JSON.parse(sessionStorage.getItem('statsUser')) || null,
    sourceTotalTracks: sessionStorage.getItem('sourceTotalTracks') || 0,
    likedSongs: [], // Temporary array to hold track IDs
    activeTool: sessionStorage.getItem('activeTool') || null
};

// DOM Elements
const elements = {
    landingPage: document.getElementById('landing-page'),
    appContainer: document.getElementById('app-container'),
    statsAppContainer: document.getElementById('stats-app-container'),
    
    // Transfer UI
    sourceProfile: document.getElementById('source-profile'),
    sourceAvatar: document.getElementById('source-avatar'),
    sourceName: document.getElementById('source-name'),
    sourceCount: document.getElementById('source-count'),
    btnConnectSource: document.getElementById('btn-connect-source'),
    btnNext1: document.getElementById('btn-next-1'),
    
    destProfile: document.getElementById('dest-profile'),
    destAvatar: document.getElementById('dest-avatar'),
    destName: document.getElementById('dest-name'),
    btnConnectDest: document.getElementById('btn-connect-dest'),
    btnNext2: document.getElementById('btn-next-2'),
    
    reviewCount: document.getElementById('review-count'),
    summarySource: document.getElementById('summary-source'),
    summaryDest: document.getElementById('summary-dest'),
    
    transferActiveUI: document.getElementById('transfer-active-ui'),
    progressBar: document.getElementById('transfer-progress-bar'),
    statusText: document.getElementById('transfer-status-text'),
    percentageText: document.getElementById('transfer-percentage'),
    logConsole: document.getElementById('log-console'),
    btnStartTransfer: document.getElementById('btn-start-transfer'),
    btnBack3: document.getElementById('btn-back-3'),
    
    successCount: document.getElementById('success-count'),
    errorToast: document.getElementById('error-toast'),
    errorMessage: document.getElementById('error-message'),

    // Stats UI
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

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    checkUrlForTokens();
    
    // Show app immediately to prevent landing page flash if we have an active tool
    if (state.activeTool) {
        startApp(state.activeTool);
    }
    
    await checkExistingSessions();
    setupJsonUpload();
});

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

function checkUrlForTokens() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const type = urlParams.get('type');
    const error = urlParams.get('error');
    
    if (error) {
        showError(`Authentication error: ${error}`);
        // Clean URL
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
        
        // Clean URL
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

async function updateUI() {
    // Step 1 UI
    if (state.sourceUser) {
        elements.sourceName.textContent = state.sourceUser.display_name || 'Spotify User';
        if (state.sourceUser.images && state.sourceUser.images.length > 0) {
            elements.sourceAvatar.src = state.sourceUser.images[0].url;
        } else {
            elements.sourceAvatar.src = 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021'; // Default
        }
        
        elements.sourceProfile.classList.remove('hidden');
        elements.btnConnectSource.classList.add('hidden');
        elements.btnNext1.classList.remove('hidden');
        
        if (state.sourceTotalTracks === 0) {
            state.sourceTotalTracks = await fetchTracksCount(state.sourceToken);
            sessionStorage.setItem('sourceTotalTracks', state.sourceTotalTracks);
        }
        elements.sourceCount.textContent = `${state.sourceTotalTracks} liked songs found`;
        
        // Auto-advance if came from redirect and we have dest logic to do
        if (!state.destToken) {
            goToStep(2);
        }
    }
    
    // Step 2 UI
    if (state.destUser) {
        elements.destName.textContent = state.destUser.display_name || 'Spotify User';
        if (state.destUser.images && state.destUser.images.length > 0) {
            elements.destAvatar.src = state.destUser.images[0].url;
        } else {
            elements.destAvatar.src = 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021';
        }
        
        elements.destProfile.classList.remove('hidden');
        elements.btnConnectDest.classList.add('hidden');
        elements.btnNext2.classList.remove('hidden');
        
        // Auto-advance
        if (state.sourceUser && state.destUser) {
            goToStep(3);
        }
    }
    
    // Review UI
    if (state.sourceUser && state.destUser) {
        elements.reviewCount.textContent = state.sourceTotalTracks;
        elements.summarySource.textContent = state.sourceUser.display_name || 'Source Account';
        elements.summaryDest.textContent = state.destUser.display_name || 'Destination Account';
    }
}

function connectAccount(type) {
    if (type === 'destination') {
        const logoutWin = window.open('https://accounts.spotify.com/en/logout', 'Spotify Logout', 'width=700,height=500,top=40,left=40');
        if (logoutWin) {
            // Wait 2 seconds for logout to process, then close and redirect
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

function goToStep(step) {
    document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-step-${step}`).classList.add('active');
    
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    
    for (let i = 1; i <= step; i++) {
        const stepEl = document.getElementById(`nav-step-${i}`);
        if (i === step) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
        }
    }
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

function showError(msg) {
    elements.errorMessage.textContent = msg;
    elements.errorToast.classList.remove('hidden');
    setTimeout(() => {
        elements.errorToast.classList.add('hidden');
    }, 5000);
}

// ----------------------------------------------------
// TRANSFER LOGIC
// ----------------------------------------------------

async function fetchWithRetry(url, options, token, retries = 3) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, options);
        
        if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After') || 3;
            logMsg(`Rate limited. Waiting ${retryAfter} seconds...`, 'warning');
            await new Promise(r => setTimeout(r, retryAfter * 1000));
            continue; // Retry
        }
        
        if (res.status === 403) {
            throw new Error(`HTTP 403 Forbidden: Your second Spotify account is not added to the 'Users and Access' whitelist in your Spotify Developer Dashboard. Please add its email there, then try again.`);
        }

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        // Handle 200/201 (PUT might not return JSON)
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }
    throw new Error('Max retries exceeded for rate limits.');
}

async function startTransfer() {
    if (!state.sourceToken || !state.destToken) return;
    
    // UI Update
    elements.btnStartTransfer.classList.add('hidden');
    elements.btnBack3.classList.add('hidden');
    elements.transferActiveUI.classList.remove('hidden');
    elements.logConsole.innerHTML = '';
    
    logMsg('Initializing transfer...');
    state.likedSongs = []; // Reset
    
    try {
        // 1. EXTRACTION PHASE
        logMsg('Phase 1: Fetching tracks from source account...');
        elements.statusText.textContent = 'Fetching source tracks...';
        
        let offset = 0;
        const limit = 50;
        let total = parseInt(state.sourceTotalTracks) || 1;
        
        while (offset < total) {
            logMsg(`Fetching tracks ${offset} to ${offset + limit}...`);
            const data = await fetchWithRetry(
                `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
                { method: 'GET' },
                state.sourceToken
            );
            
            if (data.total > total) total = data.total; // Update total if it changed
            
            const trackIds = data.items.map(item => item.track.id).filter(id => id);
            state.likedSongs.push(...trackIds);
            
            offset += limit;
            
            // Progress: Extraction counts as 50% of the total job
            let percent = Math.min(50, Math.round((offset / total) * 50));
            elements.progressBar.style.width = `${percent}%`;
            elements.percentageText.textContent = `${percent}%`;
        }
        
        logMsg(`Successfully extracted ${state.likedSongs.length} tracks.`, 'success');
        
        // 2. INSERTION PHASE
        logMsg('Phase 2: Saving tracks to destination account...');
        elements.statusText.textContent = 'Saving to destination...';
        
        // Spotify PUT /v1/me/tracks takes max 50 IDs per request
        const chunks = [];
        for (let i = 0; i < state.likedSongs.length; i += 50) {
            chunks.push(state.likedSongs.slice(i, i + 50));
        }
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            logMsg(`Saving batch ${i + 1} of ${chunks.length}...`);
            
            await fetchWithRetry(
                `https://api.spotify.com/v1/me/tracks`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: chunk })
                },
                state.destToken
            );
            
            // Progress: Insertion is the other 50%
            let percent = 50 + Math.round(((i + 1) / chunks.length) * 50);
            elements.progressBar.style.width = `${percent}%`;
            elements.percentageText.textContent = `${percent}%`;
        }
        
        logMsg('All tracks saved successfully!', 'success');
        elements.statusText.textContent = 'Transfer Complete!';
        
        // Finish
        setTimeout(() => {
            elements.successCount.textContent = state.likedSongs.length;
            goToStep(4);
        }, 1500);
        
    } catch (e) {
        logMsg(`Error during transfer: ${e.message}`, 'error');
        showError(`Transfer failed: ${e.message}`);
        elements.btnStartTransfer.classList.remove('hidden');
        elements.btnStartTransfer.textContent = "Retry Transfer";
        elements.btnBack3.classList.remove('hidden');
    }
}

function restartApp() {
    sessionStorage.clear();
    window.location.href = '/';
}

// ----------------------------------------------------
// STATS DASHBOARD LOGIC
// ----------------------------------------------------

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
        
        // Populate header
        elements.statsUsername.textContent = state.statsUser.display_name || 'Spotify User';
        if (state.statsUser.images && state.statsUser.images.length > 0) {
            elements.statsAvatar.src = state.statsUser.images[0].url;
        } else {
            elements.statsAvatar.src = 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021';
        }
        elements.statsFollowers.textContent = state.statsUser.followers ? state.statsUser.followers.total.toLocaleString() : '0';
        
        // Populate Liked Songs count
        let totalTracks = await fetchTracksCount(state.statsToken);
        elements.statsLikedCount.textContent = totalTracks.toLocaleString();
        
        // Fetch Top Artists & Calculate Genres
        const topArtists = await fetchTopData('artists', state.statsToken);
        elements.topArtistsList.innerHTML = '';
        if (topArtists && topArtists.items) {
            // Aggregate Genres
            const genreCounts = {};
            topArtists.items.forEach(artist => {
                artist.genres.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            });
            const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
            
            const genreContainer = document.getElementById('top-genres-list');
            if (genreContainer) {
                genreContainer.innerHTML = sortedGenres.map(g => `<div class="genre-badge">${g}</div>`).join('');
            }
            
            // Render Top 10 Artists
            topArtists.items.slice(0, 10).forEach((artist, index) => {
                const li = document.createElement('li');
                li.className = 'top-item';
                const imgUrl = artist.images && artist.images.length > 0 ? artist.images[0].url : 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021';
                li.innerHTML = `
                    <span class="top-item-rank">#${index + 1}</span>
                    <img src="${imgUrl}" class="top-item-img" alt="${artist.name}">
                    <div class="top-item-info">
                        <div class="top-item-name">${artist.name}</div>
                        <div class="top-item-sub">Genres: ${artist.genres.slice(0,2).join(', ')}</div>
                    </div>
                `;
                elements.topArtistsList.appendChild(li);
            });
        }
        
        // Fetch Top Tracks & Calculate Audio Vibes
        const topTracks = await fetchTopData('tracks', state.statsToken);
        elements.topTracksList.innerHTML = '';
        if (topTracks && topTracks.items) {
            // Calculate Vibes
            const trackIds = topTracks.items.map(t => t.id).join(',');
            const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, {
                headers: { 'Authorization': `Bearer ${state.statsToken}` }
            });
            if (featuresRes.ok) {
                const featuresData = await featuresRes.json();
                if (featuresData.audio_features) {
                    let totalDance = 0, totalEnergy = 0, totalValence = 0;
                    let count = 0;
                    featuresData.audio_features.forEach(f => {
                        if (f) {
                            totalDance += f.danceability;
                            totalEnergy += f.energy;
                            totalValence += f.valence;
                            count++;
                        }
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

            // Render Top 10 Tracks
            topTracks.items.slice(0, 10).forEach((track, index) => {
                const li = document.createElement('li');
                li.className = 'top-item';
                const imgUrl = track.album.images && track.album.images.length > 0 ? track.album.images[0].url : 'https://i.scdn.co/image/ab6761610000e5eb55d39ab9c21d506aa52f7021';
                li.innerHTML = `
                    <span class="top-item-rank">#${index + 1}</span>
                    <img src="${imgUrl}" class="top-item-img" alt="${track.name}">
                    <div class="top-item-info">
                        <div class="top-item-name">${track.name}</div>
                        <div class="top-item-sub">${track.artists.map(a => a.name).join(', ')}</div>
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
        // type = 'artists' or 'tracks'
        const res = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=long_term&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

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
        // Check for common Spotify formats (msPlayed or ms_played)
        if (typeof item.msPlayed === 'number') {
            totalMs += item.msPlayed;
        } else if (typeof item.ms_played === 'number') {
            totalMs += item.ms_played;
        }
    }
    
    if (totalMs === 0) {
        showError("Could not find any play time data in this file. Are you sure it's StreamingHistory.json?");
        return;
    }
    
    const totalMinutes = Math.floor(totalMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    
    if (totalHours > 0) {
        elements.statsPlayTime.textContent = `${totalHours.toLocaleString()} hrs`;
    } else {
        elements.statsPlayTime.textContent = `${totalMinutes.toLocaleString()} mins`;
    }
}

function downloadPDF() {
    const element = document.getElementById('dashboard-content');
    
    // Temporarily hide the auth screen if it's there, but it shouldn't be
    
    const opt = {
      margin:       10,
      filename:     'Spotify_Life_Stats.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Use html2pdf
    html2pdf().set(opt).from(element).save().then(() => {
        // done
    }).catch(err => {
        console.error("PDF generation error", err);
        showError("Failed to generate PDF. Make sure your browser allows it.");
    });
}
