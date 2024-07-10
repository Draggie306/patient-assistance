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


// Buttons for the main help, hug, stairs, water, and food buttons.
var mainButton = document.getElementById("mainHelpButton");
var hugButton = document.getElementById("hugButton");
var stairsButton = document.getElementById("stairsButton");
var waterButton = document.getElementById("waterButton");
var foodButton = document.getElementById("foodButton");


var msgBoxForWsURL = document.getElementById("initwsURL");
var statusTextP = document.getElementById("defaultHiddenStatusText");


var friendlyName = document.getElementById("friendlyName");

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
        msgBoxForWsURL.style.display = "inline";
    } else {
        // clear
        localStorage.removeItem("wsURL");
        localStorage.removeItem("isConnected");
        log("cleared all successfully.");
        return defaultWsURL;
    }
}


var sideButtons = document.getElementsByClassName("sidebutton");
var mainButton = document.getElementById("mainHelpButton");

async function buttonChangeOnConnectionEstablished() {
    // change buttons to active and not greyed out. 
    log("Received connection established call to activate buttons")

    for (var i = 0; i < sideButtons.length; i++) {
        sideButtons[i].style.backgroundColor = "#3979f0";
    }

    mainButton.style.backgroundColor = "#04AA6D";
}

async function buttonChangeOnConnectionFailed() {
    // re-grey out the buttons
    log("Received connection failed call to grey out buttons")

    for (var i = 0; i < sideButtons.length; i++) {
        sideButtons[i].style.backgroundColor = "#f0f0f0" /* took ages to find this colour */
    }

    mainButton.style.backgroundColor = "#f0f0f0";
}

function hideWsURLBox() {
    msgBoxForWsURL.style.display = "none";
}

// assign events

mainButton.addEventListener("click", function() {
    console.log(`The main button has been clicked at ${new Date()}`);
    sendSocketMessage("mainButton");
})

hugButton.addEventListener("click", function() {
    console.log(`Hug button clicked at ${new Date()}`);
    sendSocketMessage("hugButton");
})

stairsButton.addEventListener("click", function() {
    console.log(`Stairs button clicked at ${new Date()}`);
    sendSocketMessage("stairsButton");
})

waterButton.addEventListener("click", function() {
    console.log(`Water button clicked at ${new Date()}`);
    sendSocketMessage("waterButton");
})

foodButton.addEventListener("click", function() {
    console.log(`Food button clicked at ${new Date()}`);
    sendSocketMessage("foodButton");
})

// Detect changes in the WebSocket URL input box, and store the value in localStorage
msgBoxForWsURL.addEventListener("change", function() {
    handleChangedWsURL(1);
})

// Store the friendly name for reconnecting after broken connection [TODO]

/*
friendlyName.addEventListener("change", function() { // change to submit?
    localStorage.setItem("friendlyName", friendlyName.value);
})
*/
