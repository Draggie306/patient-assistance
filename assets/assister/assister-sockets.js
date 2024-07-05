console.log("[ASSISTER] Initialising assister script...");


// initialise the first socket connection
function connectToServer() {
    try {
        // Create WebSocket connection.
        displayLogAndAlert("Creating socket connection...", false);

        var wsUrl = getPreviouslyConnectedWsURL();

        socket = new WebSocket(wsUrl);
        
        // error if the connection is not established
        socket.addEventListener("error", (event) => {
            console.error(event)
            displayLogAndAlert(`Error in socket connection to ${event.currentTarget.url}, error ${event}`, true);
            socketStatus = 0;
            console.debug("Socket status is 0");
            throw new Error("Error in socket connection.");
        });

        // ONLY IF the connection is established:
        socket.addEventListener("open", (event) => {
            displayLogAndAlert("[connect/ELOpen] Connection opened successfully", false);
            onConnectionEstablished();
            socketStatus = 1;
            log("Set socket status to 1");
            socket.send(constructJSON("Hello, server!"));
            log("Message sent to server.");
        }); 

        // Listen for messages - this will be for the recipient side.
        socket.addEventListener("message", (event) => {
            log("Message from server: ", event.data);
        });

    } catch (error) {
        log(`Error in socketry script: error ${error}`);
        window.alert(`Error in socketry script was ${error}`);
        socketStatus = 0;
        log("[connect] Socket status is 0");
    }
}
