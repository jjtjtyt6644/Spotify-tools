const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startServer, stopServer, PORT } = require('./server');

let mainWindow;

async function createWindow() {
    // Start Express Server
    await startServer(PORT);

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true // Remove default window menus for a premium app feel
    });

    // Remove the default menu
    mainWindow.setMenu(null);

    // Load the web app
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Close the express server cleanly
    stopServer();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
