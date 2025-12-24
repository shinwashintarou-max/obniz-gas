// gas_sender.js（obniz → GAS 送信用 / CORS回避・壊れない版）
function createGasSender({ url, deviceId = "", intervalMs = 5000, debug = false }) {
  let last = 0;
  let queued = null;
  let sending = false;

  function logd(...a){ if (debug) console.log("[GAS]", ...a); }

  async function post(data) {
    // urlが無い/変なら何もしない（壊れない）
    if (!url || typeof url !== "string") return;

    const body = JSON.stringify(data);

    // ★ no-cors でも「本文が落ちない」ように明示
    // ※ application/json は no-cors だと制限される環境があるため、text/plain に寄せる
    // GAS側は e.postData.contents を見るので text/plain; charset=utf-8 が一番安定
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body
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
      // 失敗時は戻して再送（壊れない）
      queued = data;
      logd("send error", e);
    } finally {
      sending = false;
      if (queued) setTimeout(drain, 200);
    }
  }

  function send(payload){
    try{
      const now = Date.now();
      const data = { ...payload, _deviceId: deviceId, _ts: now };

      // 間引き：短時間はキューに上書き（最新だけ残す）
      if (now - last < intervalMs) {
        queued = data;
        return;
      }
      last = now;
      queued = data;
      drain();
    } catch(e){
      // sendが原因で本体が落ちないように握りつぶす
      logd("send exception", e);
    }
  }

  return { send };
}

