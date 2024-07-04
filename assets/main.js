console.log("Hello, mum!");

// Button element IDs are: mainHelpButton, hugButton, stairsButton, waterButton, altButton
// txtBox contains the content of the custom message to be sent
// servURL contains the websocket URL and is hidden once the connection is established

// Main button! The one right in the centre of the screem
var mainButton = document.getElementById("mainHelpButton");

mainButton.addEventListener("click", function() {
    console.log(`The main button has been clicked at ${new Date()}`);
    sendSocketMessage("mainButton");
})



// Cjeck previous input for websocket URL

function getPreviouslyConnectedWsURL() {
    // if localstorage isConnected is true AND localstorage wsURL is string
    if (localStorage.getItem("isConnected") === "true" && typeof localStorage.getItem("wsURL") === "string") {
        // then set isPreviouslyConnected to true
        isPreviouslyConnected = true;
        var msgBoxForWsURL = document.getElementById("wsURL");
        msgBoxForWsURL.style.display = "none";
        return localStorage.getItem("wsURL");
    } else {
        return "ws://localhost:8080";
    }
}

function handleChangedWsURL(type) {
    if (type === 1) {
        var msgBoxForWsURL = document.getElementById("wsURL");
        var newWsURL = msgBoxForWsURL.value;
        localStorage.setItem("wsURL", newWsURL);
        msgBoxForWsURL.style.display = "none";
        isPreviouslyConnected = true;
        return newWsURL;
    } else {
        // clear
        localStorage.removeItem("wsURL");
        localStorage.removeItem("isConnected");
    }
}
