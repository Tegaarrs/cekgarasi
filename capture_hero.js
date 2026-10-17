const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sendCDP(ws, method, params = {}, id = 1) {
  return new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function capture() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const edge = spawn(edgePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check"
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const targets = await getJson("http://127.0.0.1:9222/json");
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error("No page target found");

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(resolve => ws.onopen = resolve);

    let id = 1;
    // Enable Page
    await sendCDP(ws, "Page.enable", {}, id++);

    // 1. Desktop 1440px
    console.log("Setting desktop 1440x900 viewport...");
    await sendCDP(ws, "Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    }, id++);

    console.log("Navigating to http://127.0.0.1:8000/...");
    await sendCDP(ws, "Page.navigate", { url: "http://127.0.0.1:8000/" }, id++);
    await new Promise(r => setTimeout(r, 3000));

    const shot1440 = await sendCDP(ws, "Page.captureScreenshot", { format: "png" }, id++);
    fs.writeFileSync("hero-1440px.png", Buffer.from(shot1440.data, "base64"));
    console.log("hero-1440px.png saved successfully!");

    // 2. Mobile 390px
    console.log("Setting mobile 390x844 viewport with mobile emulation...");
    await sendCDP(ws, "Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    }, id++);
    await new Promise(r => setTimeout(r, 2000));

    const shot390 = await sendCDP(ws, "Page.captureScreenshot", { format: "png" }, id++);
    fs.writeFileSync("hero-390px.png", Buffer.from(shot390.data, "base64"));
    console.log("hero-390px.png saved successfully!");

    ws.close();
  } catch (err) {
    console.error("Error during capture:", err);
  } finally {
    edge.kill();
  }
}

capture();
