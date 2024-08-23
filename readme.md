# Patient Assistance (web)app

This project has been built to help my mother. She has recently has a total replacement surgery and needs to be able to request assistance to move/get stuff done for her at any time, as she is unable to move easily or walk at all for several months following the surgery. She uses her phone to communicate with friends and family for support, but not really me as we are on the same LAN and I am busy with my own stuff.

## SETUP
1. Clone the repository and cd into the directory.
2. Run `pip install websockets` to install the required library.
3. Run `python3 server/socketserver.py` to start the server.
4. Open the `index.html` file on the "patient" device and the `assister.html` file on the "assister" device.
5. Change any configs in the html pages, it will display this. The default port is 8001.
6. Input the patient ID on the "assister" device.
7. Test it and enjoy!


## Capabilities and Goals

The web app must be designed to do the following:

- conntect to a server to administer requests between the client "patient" and all devices owned by "helpers";
- use modern WebSockets to send and display messages to the "helper" devices;
- allow "helper" devices to display a platform-agnostic notification, and sensible alert sount;
- be as easy to use as possible with multiple levels of redundancy;
- alert all "helper" devices within 1 second of the "patient" pressing a button;
- have multiple buttons for various assistance requests;
- be fully accessible on mobile.

## Problem Research

There exists a range of programs for this in medical settings, but these are a) expensive, b) convoluted and old, and c) not designed for home use. Thus, why not fill in this void with a simple web app that can be used by anyone?

A client-server method using a reverse proxy (e.g. Cloudflare) may not be fully reliant as the app will have to go out of the LAN. Therefore local network connections should may be made. However this too may break if one machine goes into sleep/power saving mode - and the browser may not like the connection being open for too long, or http and not https connections due to the local network.

## Implementation Plan

I will be researching for the best way to have a server that listens to and manages assignations to projects on-demand. This might be through a Python basic flask app proxied through Cloudflare, or just use something on an edge server for maximum redundancy. 

> Redundancy means having multiple systems in place to prevent failure. In this context, the app should not fail to transmit the message no matter what occurs. The websocket must thus be open for up to 12 hours a day without breaking.

Therefore, to start with, I will be using the spiral development model to analyse, design, implement and have an evaluative feedback session for each iteration of the program made.

### Technology

I aim to learn React and React Native soon to create more complex but good-looking appliations that are cross-platform and platform-independent.

However, for now, I will be using and testing my raw HTML/JS/CSS skills, alongside perhaps a Python/JS webserver, and WebSockets to listen/transmit/forward messages. 

## Evaluation

I will be evaluating the app based on the following criteria:
- How easy it is to use;
- How reliable it is;
- How fast it is;
- How well it works on mobile.

## Conclusion (as of 28/07/2024)

The server that connects the devices is working well, even with some advanced functionality and new code that I have used before! The websockets library was fun to learn and I am very happy with the results. Being on the local network, responses are sent within milliseconds of the button being pressed - I can hear the alert sound on the assister view before the animation plays on the patient view! [10 marks for speed!] 

The ease of use comes in two parts. One for the assister and one for the patient. For the patient, the buttons are large and easy to press and has not been an issue. However, sometimes error messages appear randomly and the patient can get confused. In addition, the **"Send custom message"** input field does not work (yet) but this is not a big deal for the patient.
For the assister, as anticipated, the local network requirement of the websocket (thus going over http and not https) has caused some issues. I need to manually press "okay" when the browser says the connection is not secure - not ideal but not a big deal either. Also, due to not being able to play sound without interacting with the page first, I need to press something on the page first. This has caught me out a few times and could more easily be displayed with a solution on the page. As previously stated the notification and sound do work very well.
[7 marks for ease of use]

In terms of reliability, the WebSocket connection has not broken *by itself* at all - I say "at all" as it still goes down due to my own errors and messing around with the Raspberry Pi it is hosted on, perhaps once a fortnight. After adding a systemd service to start the Python server on startup this is not a big deal - but has been very noticable when it has crashed. [7.5 marks for reliability]

Finally, mobile compatibility. Despite a few early iteration hicups, it's now an installable PWA with clean buttons, icons, text and messages. There have been no complaints with the buttons: we'll give this a 10/10.