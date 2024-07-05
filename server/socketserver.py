import websockets
import asyncio
import datetime
import time
import typing
import json

patients = {}
assisters = {}


# OOP class for patients and assisters, added to a dictionary of the respective type
# Patients and assisters are identified by their IDs. Assisters are assigned to patients by their IDs.
# PatientIDs are determinedclient-side through the current datetime in js, so should be unique.
# Also, the websocket is the completely unique identifier for each patient.

class Patient:
    def __init__(self, websocket, patientID, userAgent, joinedAssister=[]):
        self.websocket = websocket  # this is the unique websocket object for each patient
        self.patientID = patientID
        self.userAgent = userAgent
        self.joinedAssister = joinedAssister

    async def send(self, message: str) -> None:
        await self.websocket.send(message)

    async def addJoinedAssister(self, websocket) -> None:
        self.joinedAssister.append(websocket)

    async def messageAllAssisters(self, message: str) -> None:
        for assister in assisters:
            await assister.websocket.send(json.dumps({"type": "patientMessage", "message": message}))


class Assister:
    def __init__(self, assisterID, websocket):
        self.assisterID = assisterID
        self.websocket = websocket


async def handler(websocket) -> None:
    while True:
        message = await websocket.recv()

        # Decode the json into patientID, userAgent, and "message" (the actual message sent by the client)
        message = json.loads(message)

        patientID = message["patientID"] if "patientID" in message else None
        clientUserAgent = message["userAgent"]
        actualMessage = message["message"]


        # Handshake message from a patient
        if actualMessage == "Hello, server!":
            print("Matched handshake message from a patient")
            await websocket.send("success")
            await websocket.send(f"Current time: {datetime.datetime.now()}")
            patients[patientID] = Patient(websocket, patientID, clientUserAgent)

        if actualMessage == "mainButton":
            print("Matched main button press")
            await relay_message_to_client("mainButton", "main button pressed")

        # Now handshake message from an assister
        if actualMessage == "assister":
            print("Matched handshake message from an assister")
            await websocket.send("success")
            await websocket.send(f"Current time: {datetime.datetime.now()}")

        # Display list of all patients on the current list to the assister frontend
        if actualMessage == "getAllPatients":
            print("Matched request for all patients")
            await websocket.send(json.dumps(patients))

        if actualMessage == "registerAssister":
            print(f"Matched request to register an assister to patient {patientID}")
            patients[patientID].addJoinedAssister(websocket)

        print(message)


async def main():
    async with websockets.serve(handler, "", 8001):
        await asyncio.Future()  # run forever


async def relay_message_to_client(msg_type: str, message: typing.Optional[str]) -> None:
    """
    Transforms and sends a message received by one patient to all registered assisters.
    """
    print("Relaying message to all assisters")

    for patient in patients:
        await patient.send(json.dumps({"type": msg_type, "message": message})) # do minimal server processing, this is decoded by the client
        print(f"Relayed message to patient {patient}; sent {message}")





















if __name__ == "__main__":
    print("running!")
    asyncio.run(main())




"""
class SocketServer:
    def __init__(self, host, port):
        self.host = host
        self.port = port

    async def start(self):
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()  # run forever

    async def handler(self, websocket, path):
        while True:
            data = await websocket.recv()
            await websocket.send(data)

    # Print received data
    async def on_message(self, data):
        print(data)


print("Starting server")

server = SocketServer("localhost", 8080)
asyncio.get_event_loop().run_until_complete(server.start())

"""