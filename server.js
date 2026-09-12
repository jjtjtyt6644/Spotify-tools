const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Check for .env in project root, or in the executable path (for production electron)
const envPaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    process.env.PORTABLE_EXECUTABLE_DIR ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, '.env') : null
].filter(Boolean);

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const getRedirectUri = (port) => `http://127.0.0.1:${port}/api/auth/callback`;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/auth/login', (req, res) => {
    const type = req.query.type;
    if (!type) return res.status(400).send('Missing type parameter');
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).send('Spotify credentials not configured in .env file.');
    }
    
    // Store type in state to retrieve in callback
    const state = type;
    const scope = 'user-read-private user-read-email user-library-read user-library-modify user-top-read';
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', getRedirectUri(PORT));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('show_dialog', 'true'); // Force dialog to prevent session collision
    
    res.redirect(authUrl.toString());
});

app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    
    if (!code) {
        return res.redirect('/?error=access_denied');
    }

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
            },
            body: new URLSearchParams({
                code: code,
                redirect_uri: getRedirectUri(PORT),
                grant_type: 'authorization_code'
            })
        });

        const data = await tokenResponse.json();

        if (data.error) {
            console.error('Spotify token error:', data);
            return res.redirect(`/?error=token_error`);
        }

        const accessToken = data.access_token;
        const type = state; // source or destination

        // Redirect back to frontend with token
        res.redirect(`/?token=${accessToken}&type=${type}`);
    } catch (err) {
        console.error('Error during token exchange:', err);
        res.redirect('/?error=server_error');
    }
});

let serverInstance = null;

function startServer(port = PORT) {
    return new Promise((resolve) => {
        serverInstance = app.listen(port, () => {
            console.log(`Server running on http://127.0.0.1:${port}`);
            resolve(serverInstance);
        });
    });
}

function stopServer() {
    if (serverInstance) {
        serverInstance.close();
    }
}

// If run directly (not required by main.js)
if (require.main === module) {
    startServer();
}

module.exports = { startServer, stopServer, PORT };
