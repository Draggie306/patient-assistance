console.log("Hello, mum!");

/*
    NOTE: Do not use https for the index.html file, as the websocket connection 
    will not work as the browser will require https for the connection to be
    secure and not allow websockets. If you are not using your local network or
    want to adapt this to be from a server online, please take the appropriate
    action and be aware that it will need some tweaking! :)
*/

const defaultWsURL = "ws://192.168.1.68:8001"; // Default to my own local network RPi hosting the server


// Button element IDs are: mainHelpButton, hugButton, stairsButton, waterButton, altButton
// txtBox contains the content of the custom message to be sent
// servURL contains the websocket URL and is hidden once the connection is established


// Main button! The one right in the centre of the screem
var mainButton = document.getElementById("mainHelpButton");
var msgBoxForWsURL = document.getElementById("initwsURL");
var statusTextP = document.getElementById("defaultHiddenStatusText");


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
    if (type === 1) { // signifies that the user has changed the wsURL
        console.log(msgBoxForWsURL)
        var newWsURL = msgBoxForWsURL.value;
        localStorage.setItem("wsURL", newWsURL);
        localStorage.setItem("isConnected", "true");
        msgBoxForWsURL.style.display = "none";
        isPreviouslyConnected = true;
        console.log("Changed wsURL to: " + newWsURL);
        return newWsURL;
    } else if (type === 2) {
        // the connection has been established so we can hide the wsURL box
        msgBoxForWsURL.style.display = "none";
    } else if (type === 3) {
        // Show wsURL input box.
        msgBoxForWsURL.style.display = "block";
    } else {
        // clear
        localStorage.removeItem("wsURL");
        localStorage.removeItem("isConnected");
        log("cleared all successfully.");
        return defaultWsURL;
    }
}

function hideWsURLBox() {
    msgBoxForWsURL.style.display = "none";
}

// assign events

mainButton.addEventListener("click", function() {
    console.log(`The main button has been clicked at ${new Date()}`);
    sendSocketMessage("mainButton");
})


msgBoxForWsURL.addEventListener("change", function() {
    handleChangedWsURL(1);
})
