const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
  "api",
  {
    checkDocker: async () => {
      return await ipcRenderer.invoke("check-docker");
    },
  },
  setInterval(async () => {
    try {
      const result = await ipcRenderer.invoke("check-docker");
      if (result) {
        console.log(result, "okay");
        const portCheck = await ipcRenderer.invoke("check-port");
        if (portCheck) {
          console.log("port 8082 is running fine", portCheck);
        } else {
          console.log("port 8082 is not running", portCheck);
        }
      } else {
        console.error("No app is running or port is not running");
      }
    } catch (error) {
      console.error("Error checking app status:", error.message);
    }
  }, 10 * 1000)
);
