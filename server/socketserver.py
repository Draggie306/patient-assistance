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


def build_json_response(shorthand: str, message: str) -> str:
    """
    Builds a JSON response to send to the client.
    `shorthand` is a string that the JS uses to determine how best to handle the message.
    `message` is the actual message to send to the client.
    """
    response = {
        "shorthand": f"patientassist.{shorthand}",
        "message": message
    }
    return json.dumps(response)


async def handler(websocket) -> None:
    while True:
        print("Received a message! Attempting to decode")
        message = await websocket.recv()

        # Decode the json into patientID, userAgent, and "message" (the actual message sent by the client)
        try:
            message = json.loads(message)
            print(message)
        except json.JSONDecodeError as e:
            await websocket.send(build_json_response('ERROR_PARSING', f"Error parsing JSON: {e}"))

        try:
            patientID = message["clientID"]# if hasattr(message, "clientID") else None # None if assister.
            clientUserAgent = message["userAgent"]
            actualMessage = message["message"]
        except KeyError as e:
            print(f"Required fields not present: {e}")
            return await websocket.send(build_json_response('ERROR_PARSING', f"Required fields not present: {e}"))


        # If there are no errs, proceed 


        if actualMessage == "Hello, server!":
            print("Matched handshake message from a patient")
            # await websocket.send("success")
            await websocket.send(build_json_response('SUCCESS', 'handshakeAck'))
            print(f"creating patient with websocket {websocket}, patientID {patientID}, and userAgent {clientUserAgent}")
            registerPatient = await register_patient(websocket, patientID, clientUserAgent)

            if registerPatient:
                await websocket.send(build_json_response('SUCCESS', 'registerAck'))
            else:
                await websocket.send(build_json_response('SERVER_EXCEPTION', 'Error registering patient'))

        if actualMessage == "mainButton":
            print("Matched main button press")
            await relay_message_to_assister("mainButton", "Main button pressed by patient")

        # Now handshake message from an assister
        if actualMessage == "assister":
            print("Matched handshake message from an assister")
            await websocket.send("success")
            await websocket.send(f"Current time: {datetime.datetime.now()}")

        # Display list of all patients on the current list to the assister frontend
        if actualMessage == "getAllPatients":
            print("Matched request for all patients")
            # await websocket.send(json.dumps(patients))
            currentPatients = await query_patients()
            await websocket.send(build_json_response('GETALLPATIENTS_SUCCESS', currentPatients))

        if actualMessage == "registerAssister":
            print(f"Matched request to register an assister to patient {patientID}")
            patients[patientID].addJoinedAssister(websocket)

        


async def send_message(Patient, message: str) -> None:
    """
    Sends a message from a patient to each registered assister.
    `Patient` is the patient object that sent the message.
    `message` - the message from the patient to the assisters.
    """

    # Each message should be a JSON response returned with essential keys: "shorthand" and "message"
    # "shorthand" is a string that the JS uses to determine how best to handle themessage
    # current shorthands are always prefixed by "assistanceapp." and can be one of:
    # "SUCCESS", "NO_ASSISTERS", "ERROR_FORWARDING", "ERROR_PARSING", "SERVER_EXCEPTION"
    # when using "SUCCESS" another key "numAssisters" is required

    # simple forwarder:




    pass


async def register_patient(websocket, patientID, userAgent) -> bool:
    """
    Registers a patient with the server.
    """
    try:
        patients[patientID] = Patient(websocket, patientID, userAgent)
        print(f"Registered patient {patientID}")
        return True
    except Exception as e:
        print(f"Error registering patient {patientID}: {e}")
        return False


async def query_patients() -> None:
    """
    Incoming call from assister view page to display all patients in the current list, their IDs, UserAgents, and total number of assisters.
    """
    print("Querying all patients")
    print(f"Patients: {patients}")

    patientsList = []
    for patient in patients:
        patientsList.append({"patientID": patients[patient].patientID, "userAgent": patients[patient].userAgent, "numAssisters": len(patients[patient].joinedAssister)})

    print(f"Returning list of patients: {patientsList}")
    return json.dumps(patientsList)


async def main():
    async with websockets.serve(handler, "", 8001):
        await asyncio.Future()  # run forever


async def relay_message_to_assister(shorthand: str, message: typing.Optional[str]) -> None:
    """
    Transforms and sends a message received by one patient to all registered assisters.
    """
    print("Relaying message to all assisters")

    for patient in patients:
        await patient.messageAllAssisters(json.dumps({"shorthand": shorthand, "message": message}))





















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