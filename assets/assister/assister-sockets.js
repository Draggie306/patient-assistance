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


function playSound(sound) {
    if (!sound.paused) {
        sound.currentTime = 0; // rewind to start
    }
    sound.play();
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
    log(`[constructJSON] the json is being constructed`)
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

            // New for offline patient linking: set lastPatient to the patientID
            // localStorage.setItem("lastPatient", getPreviouslyConnectedPatient());
            // log("Set lastPatient to the patientID");
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
                // window.alert("Registered as assister successfully.");
                document.getElementById("patientList").innerHTML = "Waiting for patient to send message...";
                hideInputIdentifierInputBox();
                clearMessageHistory();
            } else if (shorthandResponse === "patientassist.ASSISTER_REGISTER_FAILED") {
                log("[assister/ASSISTER_REGISTER_FAILED] Failed to register as assister.")
                window.alert("Failed to register as assister.");
            } else if (shorthandResponse === "patientassist.OFFLINE_CONNECT_SUCCESS") {
                log("[assister/OFFLINE_CONNECT_SUCCESS] Successfully associated with a patient device that is offline.")
                window.alert("Successfully associated with a patient device that is offline.");
            } else if (shorthandResponse === "patientassist.OFFLINE_CONNECT_FAILED") {
                log("[assister/OFFLINE_CONNECT_FAILED] There was an error connecting to an offline patient device.")
                window.alert("There was an error connecting to an offline patient device.");
            }


            // check for ACTUAL *manual* messages from the patient
            var msgtoShowAsHistory = null;

            if (shorthandResponse === "patientassist.PATIENT_MESSAGE") {
                log("[assister/PATIENT_MESSAGE] Received message from patient.")
                window.alert(`Message from patient: ${decodedMessage["message"]}`);
                msgtoShowAsHistory = decodedMessage["message"];
            } else if (shorthandResponse === "MAIN_BUTTON_PRESSED") {
                log("[assister/MAIN_BUTTON_PRESSED] Main button pressed by patient.")
                playSound(ding);
                playSound(airhorn);
                notifyMe("Patient needs assistance!");
                msgtoShowAsHistory = "<strong>Patient pressed the main HELP button!</strong>";

                //window.alert("Main button pressed by patient."); // tested and working
            } else if (shorthandResponse === "HUG_BUTTON_PRESSED") {
                log("[assister/HUG_BUTTON_PRESSED] Hug button pressed by patient.")
                playSound(ding);
                notifyMe("Patient wants a hug!");
                msgtoShowAsHistory = "Patient pressed the HUG button!";
                //window.alert("Hug button pressed by patient."); //tested 09/07/2024 07:38 working
            } else if (shorthandResponse === "STAIRS_BUTTON_PRESSED") {
                log("[assister/STAIRS_BUTTON_PRESSED] Stairs button pressed by patient.")
                playSound(ding);
                notifyMe("Patient needs help with stairs!");
                msgtoShowAsHistory = "Patient pressed the STAIRS button!";
                //window.alert("Stairs button pressed by patient."); // tested 09/07/2024 07:44 working
            } else if (shorthandResponse === "FOOD_BUTTON_PRESSED") {
                log("[assister/FOOD_BUTTON_PRESSED] Food button pressed by patient.")
                playSound(ding);
                notifyMe("Patient is hungry!");
                msgtoShowAsHistory = "Patient pressed the FOOD button!";
                //window.alert("Food button pressed by patient."); // tested 09/07/2024 07:51 working
            } else if (shorthandResponse === "WATER_BUTTON_PRESSED") {
                log("[assister/WATER_BUTTON_PRESSED] Water button pressed by patient.")
                playSound(ding);
                notifyMe("Patient needs water!");
                msgtoShowAsHistory = "Patient pressed the WATER button!";
                //window.alert("Water button pressed by patient."); // tested 09/07/2024 07:59 working
            } else {
                log(`[assister/MESSAGE] Message with shorthand from server: ${decodedMessage["message"]}`);
                // ding.play();
                // notifyMe(decodedMessage["message"]);
                // displayLogAndAlert(decodedMessage["message"], false); // should work, haven't tried
                msgtoShowAsHistory = decodedMessage["message"];
            }


            // Using the addMessageToHistory function, pass in the message
            addMessageToHistory(msgtoShowAsHistory);
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

async function reconnectToPreviousPatient(patientID) {
    // specialised function to register as an assister for an offline patient.
    // well, they might be online, but this is for saved/resumed connections from the assister device.
    sendAsync(constructJSON(`renewAssisterConnectionOffline;${patientID}`));
}

// TODO: copy async function into main.js patient side script.
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
      log(`[sendAsync] Sent message successfully`);
    });
  }
  

connectToServer();
