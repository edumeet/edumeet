const electron = require('electron');

const app = electron.app;

const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;

const path = require('path');
const url = require('url');

let mainWindow;

function createWindow()
{
	mainWindow = new BrowserWindow({
		width          : 1280,
		height         : 720,
		webPreferences : { nodeIntegration: true }
	});

	Menu.setApplicationMenu(null);

	const startUrl = process.env.ELECTRON_START_URL || url.format({
		pathname : path.join(__dirname, '/../build/index.html'),
		protocol : 'file:',
		slashes  : true
	});

	mainWindow.loadURL(startUrl);

	mainWindow.on('closed', () =>
	{
		mainWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', () =>
{
	if (process.platform !== 'darwin')
	{
		app.quit();
	}
});

app.on('activate', () =>
{
	if (mainWindow === null)
	{
		createWindow();
	}
});
