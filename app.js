const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow // so long, gay bowser
const path = require('path');
const url = require('url');

let mainWindow;
let devTools = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: devTools ? 1280 : 520,
        height: 645,
        autoHideMenuBar: true,
        useContentSize: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'client/index.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.focus();

    if (devTools) { mainWindow.webContents.openDevTools() };

    mainWindow.on('closed', function() {
        mainWin = null;
    });
};

app.on('ready', createWindow);
app.on('window-all-closed', function() {
    app.quit();
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow();
    };
});