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
      const ip = await ipcRenderer.invoke("retrieve-ip");
      console.log(ip, "thats ip");
      if (ip) {
        const ipObj = {
          ip: ip,
        };
        const result = await ipcRenderer.invoke("check-docker");
        if (result) {
          console.log(result, "docker is running");
          const portCheck = await ipcRenderer.invoke("check-port", 8082);
          const port2Check = await ipcRenderer.invoke("check-port", 8081);

          if (portCheck && port2Check) {
            console.log("port 8082 and 8081 are running fine", portCheck);
            // const cpuUsage = await ipcRenderer.invoke("check-cpu");
            const gpuUsage = await ipcRenderer.invoke("check-gpu");

            // if (cpuUsage.success) {
            //   console.log("Cpu is working good", cpuUsage);
            if (gpuUsage > 40) {
              console.log("Gpu is working fine", gpuUsage);
              const onPremPing = await ipcRenderer.invoke("send-onPrem", ipObj);
              if (onPremPing) {
                const time = Date.now().toLocaleString();
                console.log(onPremPing, "hehehe", time);
              } else {
                console.log("ping not sent ");
              }
            } else {
              console.log("gpu is not working fine", gpuUsage);
            }
            // } else {
            //   console.log("cpu is not working fine", cpuUsage);
            // }
          } else {
            console.log("port 8082 or 8081 is not running", portCheck);
          }
        } else {
          console.error("No app is running or port is not running");
        }
      }
    } catch (error) {
      console.error("Error checking app status:", error.message);
    }
  }, 5 * 1000)
);
