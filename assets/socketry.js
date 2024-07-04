console.log("Socketry (not sorcery) script loaded.");

var statusTextP = document.getElementById("defaultHiddenStatusText");
var socketStatus = null;

function displayLogAndAlert(message, shouldAlertToo) {
    statusTextP.innerHTML = message;
    console.log(message);

    if (shouldAlertToo) {
        window.alert(message)
    }
}

try {
    // Create WebSocket connection.
    displayLogAndAlert("Creating socket connection...", false);

    var wsUrl = getPreviouslyConnectedWsURL();

    const socket = new WebSocket(wsUrl);
    
    // error if the connection is not established
    socket.addEventListener("error", (event) => {
        console.error(event)
        displayLogAndAlert(`Error in socket connection to ${event.currentTarget.url}, error ${event}`, true);
        socketStatus = 0;
        throw new Error("Error in socket connection.");
    });

    // ONLY IF the connection is established:
    socket.addEventListener("open", (event) => {
        displayLogAndAlert("Connection opened successfully", false);
        socketStatus = 1;
        socket.send("Hello Server!");
        console.log("Message sent to server.");
    });


    // Listen for messages - this will be for the recipient side.
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
        displayLogAndAlert(`The socket failed to connect to ${wsUrl}`, true);
    } else {
        displayLogAndAlert("The socket is being created, please wait a moment.", true);
    }
}