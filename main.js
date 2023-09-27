const { app, BrowserWindow, ipcMain, ipcRenderer } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const fetch = require("electron-fetch").default;
const ip = require("ip");
try {
  require("electron-reloader")(module);
} catch {}

async function createWindow() {
  const win = new BrowserWindow({
    width: 768,
    height: 560,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile("src/index.html");

  ipcMain.handle("check-docker", async (event) => {
    return new Promise((resolve, reject) => {
      if (process.platform == "darwin" || process.platform == "linux") {
        try {
          exec(`ps aux | grep -v grep | grep 'Docker'`, (error, stdout) => {
            if (!error && stdout) {
              resolve({ success: true, isRunning: true });
            } else {
              // resolve({ success: false, isRunning: false });
              console.log("Docker isn't running");
              reject(new Error("Docker is not running but why", error));
              resolve("Ignored");
              console.log("failed");
            }
          });
        } catch (error) {
          console.log("caught an app error");
        }
      } else if (process.platform === "win32") {
        console.log("Checking on Windows...");

        exec(
          `tasklist /FI "IMAGENAME eq Docker Desktop.exe"`,
          (error, stdout) => {
            if (!error && stdout.toLowerCase().includes("Docker")) {
              resolve({ success: true, isRunning: true });
              console.log("Docker is running on Windows.");
            } else {
              reject("Docker is not running on Windows.");
              console.error("Docker is not running on Windows.");
            }
          }
        );
      } else {
        console.log("Unsupported operating system.");
        reject("Unsupported operating system.");
      }
    });
  });
  ipcMain.handle("check-port", async (event) => {
    return new Promise((resolve, reject) => {
      if (process.platform == "darwin" || process.platform == "linux") {
        try {
          exec(`lsof -i :8082`, (error, stdout) => {
            if (!error && stdout) {
              resolve({ success: true, portRunning: true });
            } else {
              // resolve({ success: false, isRunning: false });
              console.log("Port 8082 isn't running");
              reject(new Error("Port 8082 is not running somehow", error));
              resolve("Ignored");
              console.log("failed");
            }
          });
        } catch (error) {
          console.log("caught an app error");
        }
      } else if (process.platform === "win32") {
        console.log("Checking on Windows...");

        exec(`netstat -a -n -o | find "8082"`, (error, stdout) => {
          if (!error && stdout.toLowerCase().includes("8082")) {
            resolve({ success: true, portRunning: true });
            console.log("Port 8082 is running on Windows.");
          } else {
            reject("Port 8082 is not running on Windows.");
            console.error("Port 8082 is not running on Windows.");
          }
        });
      } else {
        console.log("Unsupported operating system.");
        reject("Unsupported operating system.");
      }
    });

    //   netstat -a -n -o | find "8080"
  });
  ipcMain.handle("check-cpu", async (event) => {
    return new Promise((resolve, reject) => {
      if (process.platform === "win32") {
        console.log("Checking on Windows...");

        exec(`wmic cpu get loadpercentage`, (error, stdout) => {
          if (!error && stdout) {
            console.log("working", stdout);
            let matches = stdout.match(/(\d+)/);
            console.log(matches);
            if (parseInt(matches[0]) > 2) {
              resolve({
                success: true,
                result: matches[0],
                message: "cpu usage is more than 40%",
              });
              console.log("Port 8082 is running on Windows.");
            } else {
              resolve({
                success: false,
                result: matches[0],
                message: "cpu usage is more than 40%",
              });
            }
          } else {
            reject("Port 8082 is not running on Windows.");
            console.error("Port 8082 is not running on Windows.");
          }
        });
      } else {
        console.log("this is mac");
      }
    });
  });

  const clientIP = ip.address();

  const ipObj = {
    ip: clientIP,
  };
  console.log(ipObj);
  ipcMain.handle("send-onPrem", async (event) => {
    try {
      const response = await fetch("https://api.metadome.ai/heartbeat-dev/on-prem", {
        method: "POST",
        body: JSON.stringify(ipObj),
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response);

      if (response.ok) {
        const responseData = await response.json();
        console.log("Ping request sent successfully from on-prem", responseData);
        return { success: true, message: "pint sent ssuccesfully to on-prem" };
      } else {
        setTimeout(async () => {
          try {
            const response = await fetch("https://api.metadome.ai/heartbeat-dev/on-prem", {
              method: "POST",
              body: JSON.stringify(ipObj),
              headers: {
                "Content-Type": "application/json",
              },
            });
          } catch (error) {
            console.error("Failed to send ping request again", error);
          }
        }, 30 * 60 * 1000);

        console.error("Failed to send ping request", response.statusText);
        return { success: false };
      }
    } catch (error) {
      console.error("Error sending ping request:", error);
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  app.quit();
});
