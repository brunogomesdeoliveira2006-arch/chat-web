let socket;

function conectar() {
    const url = "wss://uncommitting-curtailedly-almeta.ngrok-free.dev/chat";

    socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("🔗 Conectado ao servidor WebSocket!");
    };

    socket.onmessage = (event) => {
        processarMensagem(event.data);
    };

    socket.onclose = () => {
        console.log("❌ Desconectado. Tentando reconectar em 2s...");
        setTimeout(conectar, 2000);
    };

    socket.onerror = (err) => {
        console.error("⚠️ Erro WebSocket:", err);
    };
}

window.onload = () => {
    conectar();

    document.getElementById("msgInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });
};

function sendMessage() {
    const input = document.getElementById("msgInput");
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    socket.send(text);
    input.value = "";
}

function processarMensagem(texto) {
    if (texto.startsWith("[Bot]")) {
        addMessage("bot", texto.substring(6));
    } else if (texto.startsWith("[Sistema]")) {
        addMessage("system", texto.substring(10));
    }
}

function addMessage(sender, text) {
    const area = document.getElementById("messages");
    const msgDiv = document.createElement("div");

    msgDiv.classList.add("message", sender);

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.innerText = text;

    msgDiv.appendChild(bubble);
    area.appendChild(msgDiv);
    area.scrollTop = area.scrollHeight;
}
