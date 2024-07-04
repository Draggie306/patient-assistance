console.log("Socketry (not sorcery) script loaded.");

var socketStatus = null;

try {
    // Create WebSocket connection.
    console.log("Creating WebSocket connection...");

    var wsUrl = getPreviouslyConnectedWsURL();

    const socket = new WebSocket(wsUrl);
    
    // error if the connection is not established
    socket.addEventListener("error", (event) => {
        console.error("Error in socket connection.");
        notifyMe("Error in socket connection.");
        socketStatus = 0;
        throw new Error("Error in socket connection.");
    });

    // ONLY IF the connection is established:
    socket.addEventListener("open", (event) => {
        console.log("Connection opened successfully");
        socketStatus = 1;
        socket.send("Hello Server!");
        console.log("Message sent to server.");
    });

    socket.addEventListener("message", (event) => {
    console.log("Message from server: ", event.data);
    });
} catch (error) {
    console.error(`Error in socketry script: error ${error}`);
    window.alert(`Error in socketry script was ${error}`);
    var socketStatus = 0;
}

function sendSocketMessage(message) {
    if (socketStatus === 1) {
        socket.send(message);
    } if (socketStatus === 0) {
        console.error(`The socket failed to connect to ${wsUrl}`);
        window.alert(`The socket failed to connect to ${wsUrl}`);
    } else {
        console.error("The socket is being created, please wait a moment.");
        window.alert("The socket is being created, please wait a moment.");
    }
}