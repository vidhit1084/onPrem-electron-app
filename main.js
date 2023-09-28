const { app, BrowserWindow, ipcMain, ipcRenderer } = require("electron");
const { exec } = require("child_process");
const path = require("path");
const fetch = require("electron-fetch").default;
const si = require("systeminformation");
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

  ipcMain.handle("retrieve-ip", async (event) => {
    return new Promise((resolve, reject) => {
      if (process.platform == "darwin" || process.platform == "linux") {
        // try {
        exec(
          `ifconfig en0 | grep "inet " | awk '{print $2}'`,
          (error, stdout) => {
            const ipPattern = /\d+\.\d+\.\d+\.\d+/;
            const match = stdout.match(ipPattern);
            if (!error && match) {
              resolve(match[0]);
              console.log("Retrieved IP on mac");
            } else {
              reject("No IP found on mac.");
              console.error("No IP found on mac.");
            }
          }
        );
      } else if (process.platform === "win32") {
        console.log("Checking on Windows...");

        exec(
          `netsh interface ip show address "Ethernet" | findstr "IP Address"`,
          (error, stdout) => {
            const ipPattern = /\d+\.\d+\.\d+\.\d+/;
            const match = stdout.match(ipPattern);
            if (!error && match) {
              resolve(match[0]);
              console.log("Retrieved IP");
            } else {
              reject("No IP found.");
              console.error("No IP found.");
            }
          }
        );
      } else {
        console.log("Unsupported operating system.");
        reject("Unsupported operating system.");
      }
    });
  });

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
            if (!error && stdout.includes("Docker")) {
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
          if (!error && stdout.includes("8082")) {
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
    try {
      const cpuData = await si.currentLoad();
      console.log(cpuData, "this is data");

      // Sum up the CPU usage of all cores and threads
      const totalCpuUsage = cpuData.cpus.reduce(
        (acc, core) => acc + core.load,
        0
      );
      console.log(totalCpuUsage);
      if (totalCpuUsage > 40) {
        return {
          success: true,
          result: totalCpuUsage.toFixed(2),
          message: "CPU usage is more than 40%",
        };
      } else {
        return {
          success: false,
          result: totalCpuUsage.toFixed(2),
          message: "CPU usage is not more than 40%",
        };
      }
    } catch (error) {
      console.error("Error fetching CPU usage:", error);
      return {
        success: false,
        result: 0,
        message: "Error fetching CPU usage",
      };
    }
  });

  ipcMain.handle("send-onPrem", async (event, ipObj) => {
    try {
      const response = await fetch(
        "https://api.metadome.ai/heartbeat-dev/on-prem",
        {
          method: "POST",
          body: JSON.stringify(ipObj),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log(response);

      if (response.ok) {
        const responseData = await response.json();
        console.log(
          "Ping request sent successfully from on-prem",
          responseData
        );
        return { success: true, message: "pint sent ssuccesfully to on-prem" };
      } else {
        setTimeout(async () => {
          try {
            const response = await fetch(
              "https://api.metadome.ai/heartbeat-dev/on-prem",
              {
                method: "POST",
                body: JSON.stringify(ipObj),
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
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
