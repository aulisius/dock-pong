const { app, nativeImage, BrowserWindow } = require("electron");
const { ipcMain } = require("electron");

ipcMain.on("asynchronous-message", (event, dataURI) => {
  app.dock.setIcon(nativeImage.createFromDataURL(dataURI));
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 0,
    height: 0,
    titleBarStyle: "hidden",
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  mainWindow.loadFile("index.html");
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  app.quit();
});
