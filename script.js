// script.js - cliente WebSocket com reconexão e heartbeat
(() => {
  const DEFAULT_WS = "ws://localhost:8080/chat"; // padrão local
  const statusEl = document.getElementById("connStatus");
  const urlInput = document.getElementById("urlInput");
  const btnConnect = document.getElementById("btnConnect");
  const msgInput = document.getElementById("msgInput");
  const sendForm = document.getElementById("sendForm");
  const messagesEl = document.getElementById("messages");
  let ws = null;

  // reconexão
  let shouldReconnect = true;
  let reconnectAttempts = 0;
  const MAX_BACKOFF = 30000; // ms
  let heartbeatInterval = null;

  // initialize
  function init() {
    // suggest a url: if served from same origin, try using that origin
    if (window.location.protocol.startsWith("http")) {
      // if we're served via https and there's no explicit URL, prefer wss on same host + /chat
      const sameOriginWs = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/chat";
      urlInput.value = sameOriginWs;
    } else {
      urlInput.value = DEFAULT_WS;
    }
    btnConnect.addEventListener("click", () => connect(urlInput.value.trim()));
    sendForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const txt = msgInput.value.trim();
      if (!txt || !ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(txt);
      appendMessage("Você", txt, "msg-user");
      msgInput.value = "";
      msgInput.focus();
    });
    // auto connect on load
    connect(urlInput.value.trim());
  }

  function setStatus(connected) {
    if (connected) {
      statusEl.textContent = "Conectado";
      statusEl.classList.remove("disconnected");
      statusEl.classList.add("connected");
    } else {
      statusEl.textContent = "Desconectado";
      statusEl.classList.remove("connected");
      statusEl.classList.add("disconnected");
    }
  }

  function appendMessage(author, text, cls = "msg-bot") {
    const li = document.createElement("li");
    li.className = `message ${cls}`;
    const meta = document.createElement("div");
    meta.className = "meta";
    const ts = new Date().toLocaleTimeString();
    meta.textContent = `${author} • ${ts}`;
    const body = document.createElement("div");
    body.textContent = text;
    li.appendChild(meta);
    li.appendChild(body);
    messagesEl.appendChild(li);
    // auto scroll
    messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
  }

  function connect(rawUrl) {
    if (!rawUrl) return alert("Insira a URL do WebSocket (ex: ws://localhost:8080/chat ou wss://SEU_NGROK.io/chat)");
    // close existing
    shouldReconnect = true;
    if (ws) {
      try { shouldReconnect = false; ws.close(); } catch(e){}
      ws = null;
    }
    shouldReconnect = true;
    reconnectAttempts = 0;
    _connectAttempt(rawUrl);
  }

  function _connectAttempt(url) {
    try {
      appendLog(`[sistema] conectando -> ${url}`);
      ws = new WebSocket(url);
    } catch (e) {
      appendLog("[sistema] URL inválida ou erro local: " + e.message);
      scheduleReconnect(url);
      return;
    }

    ws.addEventListener("open", () => {
      appendLog("[sistema] conexão aberta");
      setStatus(true);
      reconnectAttempts = 0;
      // start heartbeat every 25s (so ngrok idle time won't drop)
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.send("[PING]"); } catch(e){}
        }
      }, 25000);
    });

    ws.addEventListener("message", (ev) => {
      const txt = ev.data;
      // simple heuristic: server broadcasts messages like "[Usuário id] ..." or "[Bot] ..."
      // separate bot vs others by prefix if present
      if (txt.startsWith("[Bot]")) {
        appendMessage("Bot", txt.replace(/^\[Bot\]\s*/i, ""), "msg-bot");
      } else if (txt.startsWith("[Usuário") || txt.startsWith("[Usuario") || txt.startsWith("[Usuário")) {
        // show as user message (from other clients)
        appendMessage("Remoto", txt, "msg-user");
      } else {
        // generic
        appendMessage("Servidor", txt, "msg-bot");
      }
    });

    ws.addEventListener("close", (ev) => {
      appendLog(`[sistema] conexão fechada (code=${ev.code})`);
      setStatus(false);
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      if (shouldReconnect) scheduleReconnect(url);
    });

    ws.addEventListener("error", (err) => {
      appendLog("[sistema] erro de conexão");
      // errors typically trigger close -> reconnect
    });
  }

  function scheduleReconnect(url) {
    reconnectAttempts++;
    const backoff = Math.min(1000 * Math.pow(1.6, reconnectAttempts), MAX_BACKOFF);
    appendLog(`[sistema] tentativa de reconexão em ${Math.round(backoff/1000)}s (tentativa ${reconnectAttempts})`);
    setStatus(false);
    setTimeout(() => {
      if (shouldReconnect) _connectAttempt(url);
    }, backoff);
  }

  function appendLog(text) {
    const wrapped = `[${new Date().toLocaleTimeString()}] ${text}`;
    appendMessage("Log", wrapped, "msg-bot");
  }

  // init
  init();
})();
