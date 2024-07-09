console.log("[ASSISTER] Initialising assister script...");

var socketStatus = 0;
var socket = null;
let statusTextP = document.getElementById("defaultHiddenStatusText");
var clientID = new Date().getTime();
var userAgent = navigator.userAgent;
var ding = new Audio("../assets/sounds/ding.mp3");
var airhorn = new Audio("../assets/sounds/mlg-airhorn.mp3");

let specificStatusCodeMappings = {
    '1000': 'Normal Closure',
    '1001': 'Going Away',
    '1002': 'Protocol Error',
    '1003': 'Unsupported Data',
    '1004': '(For future)',
    '1005': 'No Status Received',
    '1006': 'Abnormal Closure',
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

// test with code 1011
console.log(getStatusCodeString(1011));

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


function decodeJSON(json) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.error(`Error in decoding JSON: ${error}`);
        return null;
    }
}

// initialise the first socket connection
async function connectToServer() {
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
            
            socketStatus = 1;
            log("Set socket status to 1");
            sendAsync(constructJSON("assisterConnected"));
            log("Message sent to server.");

            getAllPatients();
        }); 

        // Listen for messages - this will be for the recipient side.
        socket.addEventListener("message", (event) => {
            // Parse the JSON message
            console.log(event.data)

            // decode the message
            var decodedMessage = decodeJSON(event.data);

            var shorthandResponse = decodedMessage["shorthand"];
            if (shorthandResponse === "patientassist.GETALLPATIENTS_SUCCESS") {
                log("[assister/MESSAGE_GETALLPATIENTS_SUCCESS] Received all patients from server.")
                displayAllPatients(decodeJSON(decodedMessage["message"]));
            } else if (shorthandResponse === "patientassist.ASSISTER_REGISTERED") {
                log("[assister/ASSISTER_REGISTERED_EVENT] Registered as assister successfully.")
                window.alert("Registered as assister successfully.");
                document.getElementById("patientList").innerHTML = "Waiting for patient to send message...";
            } else if (shorthandResponse === "patientassist.ASSISTER_REGISTER_FAILED") {
                log("[assister/ASSISTER_REGISTER_FAILED] Failed to register as assister.")
                window.alert("Failed to register as assister.");
            }


            // check for ACTUAL messages from the patient

            if (shorthandResponse === "patientassist.PATIENT_MESSAGE") {
                log("[assister/PATIENT_MESSAGE] Received message from patient.")
                window.alert(`Message from patient: ${decodedMessage["message"]}`);
            } else if (shorthandResponse === "MAIN_BUTTON_PRESSED") {
                log("[assister/MAIN_BUTTON_PRESSED] Main button pressed by patient.")
                ding.play();
                airhorn.play();
                notifyMe("Patient needs assistance!");

                //window.alert("Main button pressed by patient.");
            }
        });

        socket.addEventListener("close", (event) => {
            displayLogAndAlert(`Connection closed. Code: ${event.code} (${getStatusCodeString(event.code)}), reason: ${event.reason}`, true);
            socketStatus = 0;
            console.debug("Socket status is 0");
        });

    } catch (error) {
        log(`Error in socketry script: error ${error}`);
        window.alert(`Error in socketry script was ${error}`);
        socketStatus = 0;
        // log("[connect] Socket status is 0");
    }
}

function displayAllPatients(patients) {
    // Display all patients in the patient list
    log("Displaying all patients...");
    console.log(patients);
    pPatientList.innerHTML = "";
    patients.forEach(patient => {
        pPatientList.innerHTML += `<li>${patient.patientID} with ${patient.numAssisters} assisters (${patient.userAgent})</li><br>`;
    });
}


async function getAllPatients() {
    // Get all patients from the server
    console.log("Retrieving all patients from server dict");
    log(socket)
    sendAsync(constructJSON("getAllPatients"));
}

async function registerAsAssister(patientID) {
    // Register as an assister for a patient
    log(`Registering as assister for patient ${patientID}`);
    sendAsync(constructJSON(`registerAsAssister;${patientID}`));
}

async function sendAsync(message) {
    return new Promise((resolve, reject) => {
      // Setup response handlers
      socket.onmessage = (event) => {
        resolve(event.data);
      };
      socket.onerror = (error) => {
        reject(error);
      };
      socket.send(message);
    });
  }
  

connectToServer();
