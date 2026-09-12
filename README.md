# Spotify Liked Songs Transferrer

Spotify Liked Songs Transferrer is a Hybrid Web & Electron App for managing and transferring your Spotify liked songs.

## Setup

To run this project locally, you need to set up your environment variables by creating a `.env` file.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/) and log in.
2. Create a new application to obtain your **Client ID** and **Client Secret**.
3. Create a new file named `.env` in the root directory of this project.
4. Use the format provided in `.env.example` and add your Spotify keys. Your `.env` file should look like this:

```env
PORT=3000

# go spotify https://developer.spotify.com/ and get
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

## Running the Application

First, install the dependencies:
```bash
npm install
```

### Web Application
To start the web server:
```bash
npm start
```

### Electron Desktop App
To start the desktop application:
```bash
npm run electron-dev
```

### Build Desktop App
To build the desktop application:
```bash
npm run build
```