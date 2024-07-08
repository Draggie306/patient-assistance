console.log("Socketry (not sorcery) script loaded.");


let clientID = new Date().getTime(); // somewhat redundant as server will just use the websocket instance ID
let userAgent = navigator.userAgent;
var statusTextP = document.getElementById("defaultHiddenStatusText");
var statusTextT = document.getElementById("hiddenTopText"); // top p element
let socketStatus = null; // do not assume that the socket is connected
let socket = null;
const defaultWsUrl = "ws://192.168.1.68:8001"; // default but can be changed, just easier for development

var errSound = new Audio("../assets/sounds/error.mp3");

function displayLogAndAlert(message, shouldAlertToo) {
    statusTextP.innerHTML = message;
    log(message);

    if (shouldAlertToo) {
        // play sound from assets/sounds/error.mp3
        errSound.play();

        window.alert(`error: ${message}`);
    }
}


// Use json for websocket messages.
function constructJSON(message) {
    return JSON.stringify(
        {
            "clientID": `${clientID}`,
            "userAgent": `${userAgent}`,
            "message": `${message}`
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
            displayLogAndAlert(`Error in socket connection to ${event.currentTarget.url}, error ${event}. Please ensure that the accompanying Python websocket handler is running.`, true);
            socketStatus = 0;
            if (wsUrl === defaultWsUrl) {
                let t = "You need to change the default WebSocket URL to the one of your WebSocket forwarder instance; an exemplar Python script is inthe GitHub repo.";
                // let t_old = `The default WebSocket URL is being used! If the buttons below are grey, please input the correct server URL and refresh the page.`;
                statusTextT.innerHTML = t;
                statusTextT.style.color = "#ff0000";
                handleChangedWsURL(3); // Show th box to allow user to change wsURL
            }
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


            // update LocalStorage with the new wsURL
            localStorage.setItem("wsURL", wsUrl);
            localStorage.setItem("isConnected", "true");

            handleChangedWsURL(2);
        }); 

        // Listen for messages - this will be for the recipient side.
        socket.addEventListener("message", (event) => {
            log("Message from server: ", event.data);

            // Get just the "message" key's value from the returned JSON
            let data = JSON.parse(event.data);
            let message = data.message;
            let shorthand = data.shorthand;

            // Now, decode the message, and display it.
            switch (shorthand) { // Using: https://www.w3schools.com/js/js_switch.asp
                case "patientassist.SUCCESS": // generic success
                    if (message === "patientRegisterAck") {
                        displayLogAndAlert("Registered as patient successfully.", false);
                    } else if (message === "handshakeAck") {
                        displayLogAndAlert("Handshake successful.", false);
                    } else {
                        displayLogAndAlert(`Success: ${message}`, false);
                    }
                    break;
                case "patientassist.NO_ASSISTERS":
                    displayLogAndAlert("No assister devices are currently connected.", true);
                    break;
                case "patientassist.ERROR_FORWARDING":
                    displayLogAndAlert("Error whilst forwarding the message to assisters.", true);
                    break;
                case "patientassist.ERROR_PARSING":
                    displayLogAndAlert("An error occurred whilst parsing your message. Maybe refresh the page??", true);
                    break;
                case "patientassist.SERVER_EXCEPTION":
                    displayLogAndAlert("A generic exception occurred on the server side and your request could not be completed", true); 
                    break;
                case "patientassist.RELAY_NO_ASSISTERS":
                    displayLogAndAlert("No assister devices are currently connected!", true);
                    break;
                case "patientassist.patientRegisterAck":
                    displayLogAndAlert("Patient registered successfully.", false);
                    break;
                case "patientassist.FORWARDING_SUCCESS":
                    displayLogAndAlert(message, true);
                    break;
                default:
                    displayLogAndAlert(`${message}`, true); // Ensure msg is displayed as a string
                    break;
            }
        });

    } catch (error) {
        log(`Error in socketry script: error ${error}`);
        window.alert(`Error in socketry script was ${error}`);
        socketStatus = 0;
        log("[connect] Socket status is 0");
    }
}


function heartbeat() {
    // Send a heartbeat to the server
    socket.send(constructJSON("ping"));
}

const interval = setInterval(function ping() {
    socket.send(constructJSON("heartbeat"));
}, 30000); // 30 seconds

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