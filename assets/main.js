console.log("Hello, mum!");

// Button element IDs are: mainHelpButton, hugButton, stairsButton, waterButton, altButton
// txtBox contains the content of the custom message to be sent
// servURL contains the websocket URL and is hidden once the connection is established

const defaultWsURL = "ws://localhost:8080";

// Main button! The one right in the centre of the screem
var mainButton = document.getElementById("mainHelpButton");
var msgBoxForWsURL = document.getElementById("initwsURL");
var statusTextP = document.getElementById("defaultHiddenStatusText");

// Cjeck previous input for websocket URL

function getPreviouslyConnectedWsURL() {
    // if localstorage isConnected is true AND localstorage wsURL is string
    if (localStorage.getItem("isConnected") === "true" && typeof localStorage.getItem("wsURL") === "string") {
        // then set isPreviouslyConnected to true
        isPreviouslyConnected = true;
        msgBoxForWsURL.style.display = "none";
        const x = `ws://${localStorage.getItem("wsURL")}`
        return x;
    } else {
        return defaultWsURL;
    }
}

function handleChangedWsURL(type) {
    if (type === 1) {
        console.log(msgBoxForWsURL)
        var newWsURL = msgBoxForWsURL.value;
        localStorage.setItem("wsURL", newWsURL);
        msgBoxForWsURL.style.display = "none";
        isPreviouslyConnected = true;
        console.log("Changed wsURL to: " + newWsURL);
        return newWsURL;
    } else {
        // clear
        localStorage.removeItem("wsURL");
        localStorage.removeItem("isConnected");
        console.log("cleared all successfully.");
    }
}


// assign events

mainButton.addEventListener("click", function() {
    console.log(`The main button has been clicked at ${new Date()}`);
    sendSocketMessage("mainButton");
})


msgBoxForWsURL.addEventListener("change", function() {
    handleChangedWsURL(1);
})
