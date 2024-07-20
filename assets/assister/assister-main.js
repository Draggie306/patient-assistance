console.log("Hello, mum's helper! 🎉");

/*
    NOTE: Do not use https for the index.html file, as the websocket connection 
    will not work as the browser will require https for the connection to be
    secure and not allow websockets. If you are not using your local network or
    want to adapt this to be from a server online, please take the appropriate
    action and be aware that it will need some tweaking! :)
*/

var msgBoxForWsURL = document.getElementById("initwsURL");
var pPatientList = document.getElementById("patientList");
var inputPatientId = document.getElementById("patientIdInput");
const defaultWsURL = "ws://192.168.1.68:8001"; // Default to my own local network RPi hosting the server
var dingSound = new Audio("../assets/sounds/ding.mp3");


function log(message, level = 1) {
    if (level == 1) {
        console.log(`%c[${Date.now()}] ${message}`, "color: #8a058f; font-size: 1.2em; background-color: #000000; padding: 3px; border-radius: 2px;");
    } else if (level == 2) {
        console.error(`%c[${Date.now()}] ${message}`, "color: #e72a11; font-weight: bold; font-size: 1.2em; background-color: #000000; padding: 5px; border-radius: 2px;");
    }
}

// Cjeck previous input for websocket URL

function getPreviouslyConnectedWsURL() {
    console.log("[getPrevConn] Checking for previous connection");
    // if localstorage isConnected is true AND localstorage wsURL is string
    if (localStorage.getItem("isConnected") === "true" && typeof localStorage.getItem("wsURL") === "string") {
        // then set isPreviouslyConnected to true
        isPreviouslyConnected = true;
        msgBoxForWsURL.style.display = "none";
        const x = `${localStorage.getItem("wsURL")}`
        return x;
    } else {
        console.log("[getPrevConn] No previous connection found, returning default wsURL");
        return defaultWsURL;
    }
}

function getPreviouslyConnectedPatient() {
    console.log("[getPrevConn] Checking for previous patient");

    // Check localStorage for "lastPatient" key
    if (localStorage.getItem("lastPatient") !== null) {
        // if it exists, return the value
        log(`[getPrevConn] Found a previous patient: ${localStorage.getItem("lastPatient")}`);

        // Confirm taken from: https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm.
        if (confirm(`Would you like to assist the previous patient, ${localStorage.getItem("lastPatient")}?`)) {
            // if yes, return the patient ID
            return localStorage.getItem("lastPatient");
        } else {
            // if no, clear the localStorage value and return null
            localStorage.removeItem("lastPatient");
            return null;
        }
    } else {
        log("[getPrevConn] Determined that there has been no previous patient.");
        return null;
    }
}

function handleChangedWsURL(type) {
    if (type === 1) {
        console.log(msgBoxForWsURL)
        var newWsURL = msgBoxForWsURL.value;
        localStorage.setItem("wsURL", newWsURL);
        localStorage.setItem("isConnected", "true");
        msgBoxForWsURL.style.display = "none";
        isPreviouslyConnected = true;
        console.log("Changed wsURL to: " + newWsURL);
        return newWsURL;
    } else {
        // clear
        localStorage.removeItem("wsURL");
        localStorage.removeItem("isConnected");
        log("cleared all successfully.");
        return defaultWsURL;
    }
}


// Now, wait for the patient ID to be inputted
inputPatientId.addEventListener("keypress", function (e) {
    // legends over at https://www.w3schools.com/howto/howto_js_trigger_button_enter.asp
    if (e.key === "Enter") {
        var patientId = inputPatientId.value;
        log(`Patient ID entered: ${patientId}`);

        patientId = patientId.trim();
        log(`Cleaned patient ID: ${patientId}`);
        
        registerAsAssister(patientId);
        
        // New: add the patient ID to the localStorage
        localStorage.setItem("lastPatient", patientId);
        log(`[localStorage] Added patient ID ${patientId} as lastPatient in localStorage.`);

        inputPatientId.value = "";

    }
});

// Display "Would you like to reconnect to the previous patient?" message

function displayReconnectMessage() {
    log("[displayReconnectMessage] Displaying reconnect message.");

    let x = getPreviouslyConnectedPatient();

    if (x !== null) {
        console.log(x);
        reconnectToPreviousPatient(x);
    } else {
        log("[displayReconnectMessage] User opted not to reconnect to previous patient.");
    }
}

function clearPreviousPatient() {
    log("[clearPreviousPatient] Clearing previous patient.");
    localStorage.removeItem("lastPatient");
    log("Cleared previous patient successfully.");
}




function hideInputIdentifierInputBox() {
    inputPatientId.style.display = "none";
    log("Patient ID box hidden.");
}

var wsHistory = document.getElementById("wsHistory"); // P tag to display the history of the websocket connection

function clearMessageHistory() {
    wsHistory.innerHTML = "";
}

function addMessageToHistory(message) {
    var time = new Date();

    /* // taken from https://stackoverflow.com/questions/18229022/how-to-show-current-time-in-javascript-in-the-format-hhmmss
    console.log(
        ("0" + time.getHours()).slice(-2)   + ":" + 
        ("0" + time.getMinutes()).slice(-2) + ":" + 
        ("0" + time.getSeconds()).slice(-2)
    );
    */

    log(`[addMessageToHistory] ${("0" + time.getHours()).slice(-2)}:${("0" + time.getMinutes()).slice(-2)}:${("0" + time.getSeconds()).slice(-2)}: ${message}`, 1);
    wsHistory.innerHTML = `${("0" + time.getHours()).slice(-2)}:${("0" + time.getMinutes()).slice(-2)}:${("0" + time.getSeconds()).slice(-2)}: ${message}<br>${wsHistory.innerHTML}`;

    //wsHistory.innerHTML = `${Date.now()}: ${message}<br>${wsHistory.innerHTML}`;
}
