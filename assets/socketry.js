console.log("Socketry (not sorcery) script loaded.");


let clientID = new Date().getTime();
let userAgent = navigator.userAgent;
var statusTextP = document.getElementById("defaultHiddenStatusText");
let socketStatus = null;
let socket = null;



function displayLogAndAlert(message, shouldAlertToo) {
    statusTextP.innerHTML = message;
    log(message);

    if (shouldAlertToo) {
        window.alert(message)
    }
}


// Use json for websocket messages.
function constructJSON(message) {
    return JSON.stringify(
        {
            "clientID": clientID,
            "userAgent": userAgent,
            "message": message
        }
    );
}

function onConnectionEstablished() {
    // change buttons to active and not greyed out. 
    log("Received connection established call to activate buttons")

    var sideButtons = document.getElementsByClassName("sidebutton");
    for (var i = 0; i < sideButtons.length; i++) {
        sideButtons[i].style.backgroundColor = "#3979f0";
    }

    var mainButton = document.getElementById("mainHelpButton");
    mainButton.style.backgroundColor = "#04AA6D";
}

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


// generic send message function
function sendSocketMessage(message) {
    console.log(`socketStatus is ${socketStatus}`)
    if (socketStatus == 1) {
        socket.send(constructJSON(message));
    } else if (socketStatus == 0) {
        displayLogAndAlert(`The socket failed to connect to ${wsUrl}`, true);
    } else {
        console.log(`socket status is ${socketStatus}, so waiting for connection to be established.`);
        displayLogAndAlert("The socket is being created, please wait a moment.", true);
    }
}


function sendHelpMessage() {
    try {
        socket.send(`Help requested at ${new Date()}`);
    } catch (error) {
        displayLogAndAlert(`Error in sending help message: ${error}`, true);
    }
}

connectToServer();