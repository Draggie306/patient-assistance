console.log("Socketry (not sorcery) script loaded.");

try {
    // Create WebSocket connection.
    const socket = new WebSocket("ws://localhost:8080");

    // Connection opened
    socket.addEventListener("open", (event) => {
        socket.send("Hello Server!");
    });

    socket.addEventListener("message", (event) => {
    console.log("Message from server: ", event.data);
    });
} catch (error) {
    console.error(`Error in socketry script: error ${error}`);
    notifyMe(`Error in socketry script was ${error}`);
}