// Notifications script for patient assisance program


try {
  if ("stopStartupNotis" in localStorage) {
    console.log("Notifications are disabled")
  } else {
    notifyMe("Initialised notifications! 🎉 (if you want me to shut up, please add \"stopStartupNotis\" into a localstorage key")
  }
} catch (error) {
  console.error(error)
}

// Below function stolen from "https://developer.mozilla.org/en-US/docs/Web/API/Notification"
async function notifyMe(message) { 
    if (!("Notification" in window)) {
      // Check if the browser supports notifications
      //alert("This browser does not support desktop notification");
      console.log("not displaying notification as browser does not support it")
    } else if (Notification.permission === "granted") {
      // Check whether notification permissions have already been granted;
      // if so, create a notification
      const notification = new Notification(message);
      // …
    } else if (Notification.permission !== "denied") {
      // We need to ask the user for permission
      Notification.requestPermission().then((permission) => {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          const notification = new Notification(message);
        }
      });
    }
  
    // At last, if the user has denied notifications, and you
    // want to be respectful there is no need to bother them anymore.
  }


 