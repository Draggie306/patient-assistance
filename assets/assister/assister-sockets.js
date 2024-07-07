console.log("[ASSISTER] Initialising assister script...");

var socketStatus = 0;
var socket = null;
let statusTextP = document.getElementById("defaultHiddenStatusText");
var clientID = new Date().getTime();
var userAgent = navigator.userAgent;

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
            
            socketStatus = 1;
            log("Set socket status to 1");
            socket.send(constructJSON("assisterConnected"));
            log("Message sent to server.");

            getAllPatients();
        }); 

        // Listen for messages - this will be for the recipient side.
        socket.addEventListener("message", (event) => {
            // Parse the JSON message
            console.log(event.data)

            // decode the message
            var decodedMessage = decodeJSON(event.data);

            if (decodedMessage["shorthand"] === "patientassist.GETALLPATIENTS_SUCCESS") {
                console.log(`Patient list: ${decodedMessage["message"]}`);
                displayAllPatients(decodeJSON(decodedMessage["message"]));
            }

        });

    } catch (error) {
        log(`Error in socketry script: error ${error}`);
        window.alert(`Error in socketry script was ${error}`);
        socketStatus = 0;
        log("[connect] Socket status is 0");
    }
}

function displayAllPatients(patients) {
    // Display all patients in the patient list
    console.log("Displaying all patients...");
    console.log(patients);
    pPatientList.innerHTML = "";
    patients.forEach(patient => {
        pPatientList.innerHTML += `<li>${patient.patientID} with ${patient.numAssisters} assisters (${patient.userAgent})</li><br>`;
    });
}


function getAllPatients() {
    // Get all patients from the server
    console.log(socket)
    console.log("Getting all patients...");
    socket.send(constructJSON("getAllPatients"));
}

connectToServer();
