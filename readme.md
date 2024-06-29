# Patient Assistance (web)app

This project has been built to help my mother. She has recently has a total replacement surgery and needs to be able to request assistance to move/get stuff done for her at any time.

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

A client-server method may not ensure redundancy, so alternatively local network connections may be made. However this too may break if one machine goes into sleep/power saving mode.

## Implementation Plan

I will be researching for the best way to have a server that listens to and manages assignations to projects on-demand. This might be through a Python basic flask app proxied through Cloudflare, or just use something on an edge server for maximum redundancy. 

> Redundancy means having multiple systems in place to prevent failure. In this context, the app should not fail to transmit the message no matter what occurs. The websocket must thus be open for up to 12 hours a day without breaking.

Therefore, to start with, I will be using the spiral development model to analyse, design, implement and have an evaluative feedback session for each iteration of the program made.

### Technology

I aim to learn React and React Native soon to create more complex but good-looking appliations that are cross-platform and platform-independent.

However, for now, I will be using and testing my raw HTML/JS/CSS skills, alongside perhaps a Python/JS webserver, and WebSockets to listen/transmit/forward messages. 

## Evaluation

- Iteration 1
Coming soon!

