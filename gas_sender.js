// gas_sender.js（obniz → GAS 送信用 / CORS回避版）
function createGasSender({ url, deviceId = "", intervalMs = 5000, debug = false }) {
  let last = 0;
  let queued = null;
  let sending = false;

  function logd(...a){ if (debug) console.log("[GAS]", ...a); }

  async function post(data) {
    // ★CORS回避
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data),
    });
  }

  async function drain(){
    if (sending || !queued) return;
    sending = true;
    const data = queued;
    queued = null;

    try {
      await post(data);
      logd("sent");
    } catch(e){
      queued = data;
      logd("send error", e);
    } finally {
      sending = false;
      if (queued) setTimeout(drain, 200);
    }
  }

  function send(payload){
    const now = Date.now();
    const data = { ...payload, _deviceId: deviceId, _ts: now };

    if (now - last < intervalMs) {
      queued = data;
      return;
    }
    last = now;
    queued = data;
    drain();
  }

  return { send };
}
