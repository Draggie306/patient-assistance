console.log("Hello, mum!");

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

        registerAsAssister(patientId.trim());

        inputPatientId.value = "";
    }
});
