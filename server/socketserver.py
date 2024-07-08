import websockets
import asyncio
import datetime
import time
import typing
import json
import traceback
from typing import Optional

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
        try:
            self.joinedAssister.append(websocket)
            print(f"[debug/patient_object] Added assister {websocket} to patient {self.patientID}; length of joinedAssister: {len(self.joinedAssister)}")
            return True
        except Exception as e:
            print(f"[debug/patient_object] Error adding assister to patient {self.patientID}: {e}")
            return False

    async def messageAllAssisters(self, message: str, shorthand: Optional[str] = None) -> None:
        print(f"[debug/patient_object] Attempting to message all assisters for patient {self.patientID}")
        if len(self.joinedAssister) == 0:
            print(f"[debug/patient_object] No assisters found for patient {self.patientID}")
            return None

        assistersMessaged = 0
        for assister in self.joinedAssister: # dont use assisters dict, keep it just in the object as defined in the class. #OOP
            try:
                print(f"[debug/patient_object] Sending message to assister {assister.id}")
                await assister.send(json.dumps({
                    "type": "patientMessage",
                    "message": message,
                    "shorthand": shorthand if shorthand else "patientassist.PATIENT_MESSAGE"
                    }))
                assistersMessaged += 1
            except Exception as e:
                print(f"[debug/patient_object] Error sending message to assister {assister.id}: {e}")
                await self.websocket.send(build_json_response("ERROR_FORWARDING", f"Error sending message to assister {assister.id}"))
        
        print(f"[debug/patient_object] Messaged {assistersMessaged} assisters for patient {self.patientID}")
        return assistersMessaged


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
    patientID = None
    try:
        async for message in websocket:
            # while True:
            print("Received a message! Attempting to decode")

            print(f"Raw message: {message}")

            # Decode the json into patientID, userAgent, and "message" (the actual message sent by the client)

            # HACK FIX because I have no idea why it is sometimes one and not another
            if isinstance(message, str):
                data = json.loads(message)
            elif isinstance(message, (dict, bytes, bytearray)):
                data = message
            else:
                raise TypeError(
                    "Message must be of type str, bytes, bytearray, or dict"
                )

            try:
                patientID = data[
                    "clientID"
                ]  # if hasattr(message, "clientID") else None # None if assister.
                clientUserAgent = data["userAgent"]
                actualMessage = data["message"]
            except KeyError as e:
                print(f"Required fields not present: {e}")
                return await websocket.send(
                    build_json_response(
                        "ERROR_PARSING", f"Required fields not present: {e}"
                    )
                )

            # case for heartbeat
            if actualMessage == "ping":
                print(f"Received ping from patientID {patientID}")
                return await websocket.send("pong")

            # If there are no errs, proceed

            if actualMessage == "Hello, server!":
                print("Matched handshake message from a patient")
                # await websocket.send("success")
                await websocket.send(build_json_response("SUCCESS", "handshakeAck"))
                print(f"creating patient with websocket {websocket}, patientID {patientID}, and userAgent {clientUserAgent}")

                registerPatient = await register_patient(
                    websocket, patientID, clientUserAgent
                )

                if registerPatient:
                    await websocket.send(
                        build_json_response("SUCCESS", "patientRegisterAck")
                    )
                else:
                    await websocket.send(
                        build_json_response(
                            "SERVER_EXCEPTION", "Error registering patient"
                        )
                    )

            if actualMessage == "mainButton":
                print("Matched main button press")

                # This selection statement must thus also have the PatientID in the JSON so we know which patient sent the message
                await relay_message_to_assister(patientID=patientID, shorthand="MAIN_BUTTON_PRESSED")

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
                await websocket.send(
                    build_json_response("GETALLPATIENTS_SUCCESS", currentPatients)
                )

            if actualMessage.startswith("registerAsAssister"):
                targetPatientId = int(actualMessage.split(";")[1])
                print(f"Matched request to register an assister to patient {targetPatientId}")
                y = await patients[f'{targetPatientId}'].addJoinedAssister(websocket)
                print(y)
                if y:
                    await websocket.send(build_json_response("ASSISTER_REGISTERED", f"Assister registered successfully to patient {targetPatientId}"))
                else:
                    await websocket.send(build_json_response("ASSISTER_REGISTER_FAILED", "Error registering assister"))

    except websockets.exceptions.ConnectionClosedError as e:

        # WHY AM I GETTing "Connection closed: sent 1011 (internal error); no close frame received" here? 
        # The connection should not be closed after a valid message is sent?

        print(f"Traceback: {traceback.format_exc()}")
        print(f"Connection closed: {e}")
        if patientID in patients:
            print(f"Removing patient {patientID} from patients list")
            del patients[patientID]
        else:
            print(f"Patient {patientID} not found in patients list")


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


async def relay_message_to_assister(patientID, shorthand: Optional[str] = "PATIENT_MESSAGE") -> None:
    """
    Transforms and sends a message received by one patient to all registered assisters.

    `patientID` - the ID of the patient who sent the message.
    [optional] `shorthand` - used to determine how the message should be handled by the client. Default is "PATIENT_MESSAGE" but can also be "MAIN_BUTTON_PRESSED"
    """
    print("Relaying message to all assisters")

    print(f"\n[debug] patients: {patients}")

    patient = patients[patientID]

    if shorthand == "MAIN_BUTTON_PRESSED":
        newMessage = "Patient pressed the HELP button!"
    else:
        newMessage = "Patient sent a message!"

    x = await patient.messageAllAssisters(newMessage, shorthand)
    if x is None:
        # No assisters found for this patient, return an error message to the patient
        await patient.send(build_json_response("NO_ASSISTERS", "No assisters found for this patient"))
    else:
        # TODO: if x == 0 then obviously no assisters were found, so return an error message to the patient
        await patient.send(build_json_response("FORWARDING_SUCCESS", f"Message relayed successfully to {x} assisters"))


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
