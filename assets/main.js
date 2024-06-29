console.log("Hello, mum!");

var mainButton = document.getElementById("mainHelpButton");

mainButton.addEventListener("click", function() {
    console.log(`Hello again at ${Date.now()}`);
})
