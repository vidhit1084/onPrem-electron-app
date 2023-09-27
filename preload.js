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
        console.log(result, "docker is running");
        const portCheck = await ipcRenderer.invoke("check-port");
        if (portCheck) {
          console.log("port 8082 is running fine", portCheck);
          //   const cpuUsage = await ipcRenderer.invoke("check-cpu");
          //   if (cpuUsage.success) {
          //     console.log("Cpu is working good", cpuUsage);
          const onPremPing = await ipcRenderer.invoke("send-onPrem");
          if (onPremPing) {
            const time = Date.now().toLocaleString();
            console.log(onPremPing, "hehehe", time);
          } else {
            console.log("ping not sent ");
          }
          //   } else {
          //     console.log("cpu is not working fine", cpuUsage);
          //   }
        } else {
          console.log("port 8082 is not running", portCheck);
        }
      } else {
        console.error("No app is running or port is not running");
      }
    } catch (error) {
      console.error("Error checking app status:", error.message);
    }
  }, 5 * 1000)
);
