const logging = document.getElementById("logging");
const psmEl = document.getElementById("psm");

document.addEventListener(
  "deviceready",
  () => {
    console.log("initialise called");
    ble.startScan([], addDevice);
  },
  false
);

window.demo = {
  selectDevice(device_id) {
    window.device_id = device_id;
    logging.innerHTML = "";
    ble.connect(
      window.device_id,
      (deviceInfo) => {
        log(`Connected to ${window.device_id}`);
        for (const info of deviceInfo.characteristics) {
          if (info.characteristic == "ABDD3056-28FA-441D-A470-55A75A52553A") {
            log("Found Apple PSM Characteristic");
            log(JSON.stringify(info, null, " "));
            ble.read(
              window.device_id,
              info.service,
              info.characteristic,
              processPSMReadResult
            );
          }
        }
      },
      (e) => log(`BLE connection closed: ${e}`)
    );
  },

  openl2cap() {
    const psm = getPSM();
    log(`Opening L2CAP connection on PSM ${psm}`);
    ble.l2cap.open(
      window.device_id,
      psm,
      () => {
        log("L2CAP connection successfully opened");
        ble.l2cap.receiveData(window.device_id, psm, (data) => {
          log(`Received ${new Uint8Array(data).byteLength} bytes of L2CAP data`);
        })
      },
      (e) => log(`L2CAP connection closed: ${e}`)
    );
  },

  closel2cap() {
    const psm = getPSM();
    ble.l2cap.close(
      window.device_id,
      psm,
      () => log("L2CAP connection successfully closed"),
      (e) => log(`L2CAP connection close error: ${e}`)
    );
  },

  sendl2cap() {
    const psm = getPSM();
    log(`Sending L2CAP data on PSM ${psm}`);
    const data = new TextEncoder().encode("testing l2cap... 1... 2").buffer;
    ble.l2cap.write(
      window.device_id,
      psm,
      data,
      () => log("Successfully sent L2CAP data"),
      (e) => log(`Failed to send L2CAP data: ${e}`)
    );
  },

  disconnect() {
    ble.disconnect(window.device_id);
  },
};

function addDevice(device) {
  if (!device.name) return; // Skip unnamed devices to avoid lots of noise
  const deviceList = document.getElementsByClassName("device-list")[0];
  const deviceEl = document.createElement("li");
  deviceEl.classList.add("device-item");
  deviceEl.innerHTML = `
    <div class="device-name">${device.name || "-"}</div>
    <div class="controls">
      <button onclick="demo.selectDevice('${device.id}')">Connect</button>
    </div>`;
  deviceList.appendChild(deviceEl);
}

function getPSM() {
  return parseInt(psmEl.value, 10);
}

function processPSMReadResult(buffer) {
  let uint16, str;
  try {
    uint16 = new DataView(buffer).getUint16(0, true);
  } catch (e) {
    console.error(e);
  }
  try {
    str = new TextDecoder().decode(new Uint8Array(buffer));
  } catch (e) {
    console.error(e);
  }
  log(`PSM could be ${uint16} (uint16) or ${str} (string)`);
}

function log(message) {
  console.log(message);
  const shortDate = new Date().toJSON().substr(11, 12);
  logging.appendChild(document.createTextNode(`${shortDate}  ${message}\n`));
  logging.scrollIntoView({ behaviour: "smooth", block: "end" });
  logging.scrollTop = logging.scrollHeight;
}
