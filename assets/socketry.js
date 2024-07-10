console.log("Socketry (not sorcery) script loaded.");



if (localStorage.getItem("friendlyName") === null) {
    localStorage.setItem("friendlyName", `${new Date().getTime()}`);
    console.log("Generated new friendly name for the patient.");
}

let clientID = localStorage.getItem("friendlyName");
//new Date().getTime(); // somewhat redundant as server will just use the websocket instance ID


let userAgent = navigator.userAgent;
var statusTextP = document.getElementById("defaultHiddenStatusText");
var statusTextT = document.getElementById("hiddenTopText"); // top p element
let socketStatus = null; // do not assume that the socket is connected
let socket = null;
const defaultWsUrl = "ws://192.168.1.68:8001"; // default but can be changed, just easier for development
var socketHasBeenOpened = false;

var errSound = new Audio("../assets/sounds/error.mp3");

// WS Code Mappings taken from StackOverflow
let specificStatusCodeMappings = {
    '1000': 'Normal Closure',
    '1001': 'Going Away',
    '1002': 'Protocol Error',
    '1003': 'Unsupported Data',
    '1004': '(For future)',
    '1005': 'No Status Received',
    '1006': 'Abnormal Closure. This may mean that the server has restarted, please refresh',
    '1007': 'Invalid frame payload data',
    '1008': 'Policy Violation',
    '1009': 'Message too big',
    '1010': 'Missing Extension',
    '1011': 'Internal Error',
    '1012': 'Service Restart',
    '1013': 'Try Again Later',
    '1014': 'Bad Gateway',
    '1015': 'TLS Handshake'
};

function getStatusCodeString(code) {
    if (code >= 0 && code <= 999) {
        return '(Unused)';
    } else if (code >= 1016) {
        if (code <= 1999) {
            return '(For WebSocket standard)';
        } else if (code <= 2999) {
            return '(For WebSocket extensions)';
        } else if (code <= 3999) {
            return '(For libraries and frameworks)';
        } else if (code <= 4999) {
            return '(For applications)';
        }
    }
    if (typeof(specificStatusCodeMappings[code]) !== 'undefined') {
        return specificStatusCodeMappings[code];
    }
    return '(Unknown)';
}


async function playErrorSound() {
    if (!errSound.paused) {
        errSound.currentTime = 0;
    }
    errSound.play();
}

/*
function translateStatusCodeIntoActuallyADisplayableMessage(code) {
    // manually add codes here when encountered to better display
    if (code === 1006) {
        return "The connection was closed abnormally. This may mean that the server has restarted, please refresh";
    }
    return getStatusCodeString(code);
}
*/

/*
    * Function to display a message in the console with a timestamp.
    * @param {string} message - The message to be displayed.
    * @param {number} shouldAlertToo - Whether an alert should be shown to the user - 1 for yes, 0 for no.
*/
async function displayLogAndAlert(message, shouldAlertToo) {
    statusTextP.innerHTML = message;
    log(message);

    if (shouldAlertToo) {
        // play sound from assets/sounds/error.mp3
        await playErrorSound();

        window.alert(`error: ${message}`);
    }
}


// Use json for websocket messages.
async function constructJSON(message) {
    return JSON.stringify(
        {
            "clientID": `${clientID}`,
            "userAgent": `${userAgent}`,
            "message": `${message}`
        }
    );
}



// initialise the first socket connection
async function connectToServer() {
    try {
        // Create WebSocket connection.
        displayLogAndAlert("Creating socket connection...", false);

        var wsUrl = getPreviouslyConnectedWsURL();

        socket = new WebSocket(wsUrl);
        
        // error if the connection is not established
        socket.addEventListener("error", async (event) => {
            console.error(event)
            if (socketHasBeenOpened) { // if the socket has been opened, then the error is in the connection
                statusTextT.innerHTML = "<strong>Error in socket connection, retrying...</strong>"
                await buttonChangeOnConnectionFailed();
                autoRefreshPage();
            } else {
                displayLogAndAlert(`Error in socket connection to ${event.currentTarget.url}, error ${event.type} [${event.message}, ${socket.readyState}, ${event.code}]`, true);
                socketStatus = 0;
                log("Socket status set to 0 (failed to connect)");
                if (wsUrl === defaultWsUrl) {
                    let t = "You need to change the default WebSocket URL to the one of your WebSocket forwarder instance; an exemplar Python script is in the GitHub repo. Refreshing in 10 seconds...";
                    // let t_old = `The default WebSocket URL is being used! If the buttons below are grey, please input the correct server URL and refresh the page.`;
                    statusTextT.innerHTML = t;
                    statusTextT.style.color = "#ff0000";
                    handleChangedWsURL(3); // Shows the box to allow user to change wsURL
                }
                throw new Error("Error in socket connection.");
            }
        });

        // ONLY IF the connection is established:
        socket.addEventListener("open", async (event) => { 
            displayLogAndAlert("[connect/ELOpen] Connection opened successfully", false);
            await buttonChangeOnConnectionEstablished();
            socketStatus = 1;
            socketHasBeenOpened = true;
            log("Set socket status to 1 (connected)");
            socket.send(await constructJSON("Hello, server!"));
            log("Custom handshake message (Hello, server!) sent to server from patient");

            // New friendly name for the patient and reconnect feature
            if (localStorage.getItem("friendlyName") !== null) {
                // if the friendlyName is already set, the user want to be aBle to be reconnected.
                var friendlyName = localStorage.getItem("friendlyName");
                socket.send(await constructJSON(`associateNameToPatientObject;${friendlyName}`)); // no way, the colon before was causing the error
                //n.b.  patientID to associate the object with the friendlyName is built into the constructJSON function
            }

            // update LocalStorage with the new wsURL
            localStorage.setItem("wsURL", wsUrl);
            localStorage.setItem("isConnected", "true");

            handleChangedWsURL(2);
        }); 

        // Listen for messages - this will be for the recipient side.
        socket.addEventListener("message", (event) => {
            log(`Message from server: ${event.data}`);

            // Get just the "message" key's value from the returned JSON
            let data = JSON.parse(event.data);
            let message = data.message;
            let shorthand = data.shorthand;

            // Now, decode the message, and display it.
            switch (shorthand) { // Using: https://www.w3schools.com/js/js_switch.asp
                case "patientassist.SUCCESS": // generic success
                    if (message === "patientRegisterAck") {
                        displayLogAndAlert("✅ Registered as patient successfully.", false);
                    } else if (message === "handshakeAck") {
                        displayLogAndAlert("✅ Handshake successful.", false);
                    } else {
                        displayLogAndAlert(`✅ Success: ${message}`, false);
                    }
                    break;
                case "patientassist.NO_ASSISTERS":
                    displayLogAndAlert("⚠️ No assister devices are currently connected.", true);
                    break;
                case "patientassist.ERROR_FORWARDING":
                    displayLogAndAlert("⚠️ Error whilst forwarding the message to assisters.", false);
                    break;
                case "patientassist.ERROR_PARSING":
                    displayLogAndAlert("⚠️ An error occurred whilst parsing your message. Maybe refresh the page??", true);
                    break;
                case "patientassist.SERVER_EXCEPTION":
                    displayLogAndAlert("⚠️ A generic exception occurred on the server side and your request could not be completed", true); 
                    break;
                case "patientassist.RELAY_NO_ASSISTERS":
                    displayLogAndAlert("⚠️ No assister devices are currently connected!", true);
                    break;
                case "patientassist.patientRegisterAck":
                    displayLogAndAlert("Patient registered successfully.", false);
                    break;
                case "patientassist.ASSISTER_JOINED":
                    displayLogAndAlert("An assister has joined the session.", false);
                    break;
                case "patientassist.ASSOCIATE_MATCH_SUCCESS":
                    displayLogAndAlert("Connection established successfully, and re-associated with a previously connected patient. Good to go! 🚀", false);
                    break;
                case "patientassist.ASSOCIATE_SUCCESS":
                    displayLogAndAlert("Associated your friendly name to the current patient object for future reconnections.", false);
                    break;
                case "patientassist.ASSOCIATE_ERROR":
                    displayLogAndAlert("⚠️ Error in peforming the associations with the friendly name.", true);
                    break;
                case "patientassist.FORWARDING_SUCCESS":
                    displayLogAndAlert(message, false);
                    const jsConfetti = new JSConfetti()
                    jsConfetti.addConfetti()
                    break;
                default:
                    displayLogAndAlert(`${message}`, true); // Ensure msg is displayed as a string
                    break;
            }
        });

        // error if the connection is closed
        socket.addEventListener("close", async (event) => {
            if (event.code === 1006) {
                // New function to change the buttons to grey in case of an event.
                // This is in the 1006 as this commonly means that the client device has aborted the connection, through something like power-saving-
                // features on iOS or Android, and so should therefore reload the page, but not after firstly changing the buttons so that, in the 1-
                // 2 seconds before the page reloads, the user has a visual indicator that the connection has been lost.
                statusTextT.innerHTML = "<strong>Error in socket connection, retrying...</strong>"
                await buttonChangeOnConnectionClosed();

                // And now, reload the page.
                autoRefreshPage();
            }
            socketStatus = 0;
            log("[connect] Socket status is 0");
            console.log(`Socket closed with code ${event.code} and reason ${event.reason}`);
            console.log(`Status code string is: ${getStatusCodeString(event.code)}`);
            displayLogAndAlert(`Socket connection was closed! Code: ${event.code}, reason: ${getStatusCodeString(event.code)}`, false);
        }
        );

    } catch (error) {
        log(`Error in socketry script: error ${error}`);
        window.alert(`Error in socketry script was ${error}`);
        socketStatus = 0;
        log("[connect] Socket status is 0");
    }
}

function autoRefreshPage(interval = 100) {
    setTimeout(() => {
        log("Reloading page...");
        statusTextT.innerHTML = "<strong>Connection closed, RELOADING...</strong>"
        statusTextT.style.color = "#ff0000";
        window.location.reload();
    } , interval);
}

function heartbeat() {
    // Send a heartbeat to the server
    socket.send(constructJSON("ping"));
}

const interval = setInterval(async function ping() {
    await socket.send(await constructJSON("heartbeat"));
}, 30000); // 30 seconds

// generic send message function
async function sendSocketMessage(message) {
    // TODO: obsolete function, remove
    console.log(`socketStatus is ${socketStatus}`)
    if (socketStatus == 1) {
        socket.send(await constructJSON(message));
    } else if (socketStatus == 0) {
        displayLogAndAlert(`The socket failed to connect to ${wsUrl}`, true);
    } else {
        console.log(`socket status is ${socketStatus}, so waiting for connection to be established.`);
        displayLogAndAlert("The socket is being created, please wait a moment.", true);
    }
}


async function sendHelpMessage() {
    // TODO: obsolete function, remove
    try {
        socket.send(`Help requested at ${new Date()}`);
    } catch (error) {
        displayLogAndAlert(`Error in sending help message: ${error}`, true);
    }
}


(async () => {
    await connectToServer();
})();
