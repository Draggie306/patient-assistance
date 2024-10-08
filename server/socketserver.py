import websockets
import asyncio
import datetime
import time
import typing
import json
import traceback
from typing import Optional
import uuid

patients = {}
assisters = {}


# OOP class for patients and assisters, added to a dictionary of the respective type
# Patients and assisters are identified by their IDs. Assisters are assigned to patients by their IDs.
# PatientIDs are determinedclient-side through the current datetime in js, so should be unique.
# Also, the websocket is the completely unique identifier for each patient.

class Patient:
    def __init__(self, websocket, patientID, userAgent, friendlyName=None):
        self.websocket = websocket  # this is the unique websocket object for each patient
        self.patientID = patientID
        self.userAgent = userAgent
        self.joinedAssister = []  # Define this here as opposed to within __init__(... joinedAssister = [])! Fixed the issue of all joinedAssisters being identical across different patient objects
        self.friendlyName = friendlyName

    async def send(self, message: str) -> None:
        await self.websocket.send(message)

    async def addJoinedAssister(self, websocket, allow_offline_patients: Optional[bool] = False) -> bool:
        try:
            await self.websocket.send(build_json_response("ASSISTER_JOINED", f"Assister joined successfully to patient {self.patientID}")) # notify the patient that an assister has joined
            # If the websocket send is successful, add the assister to the list of joined assisters
            self.joinedAssister.append(websocket)
            print(f"[debug/patient_object] Added assister {websocket} to patient {self.patientID}; length of joinedAssister: {len(self.joinedAssister)}")
            return True
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[debug/patient_object] Connection closed interrupted adding assister to patient {self.patientID} ({e})")
            
            # But, if we are expecting the patient to be offline (i.e. incoming binary message is == "offlinePatientConnect;friendlyName"), then 
            # we should still add the assister to the list of joined assisters. On the client-side, this is ensured by the assister remembering a
            # previous reconnection via the friendly name.

            if allow_offline_patients:
                self.joinedAssister.append(websocket)
                print(f"[debug/patient_object] Added assister {websocket} to patient {self.patientID} (offline); length of joinedAssister: {len(self.joinedAssister)}")
                return True

            print(f"[debug/patient_object] Error adding assister to patient {self.patientID}: {e}")
            return False

    async def messageAllAssisters(self, message: str, shorthand: Optional[str] = None) -> None:
        print(f"[debug/patient_object] Attempting to message all assisters for patient {self.patientID}")
        if len(self.joinedAssister) == 0:
            print(f"[debug/patient_object] No assisters found for patient {self.patientID}")
            return None

        assistersMessaged = 0
        assisterErrs = 0
        for assister in self.joinedAssister: # dont use assisters dict, keep it just in the object as defined in the class. #OOP
            # check if the assister is still connected
            print(f"[debug] Assister: {assister.id}")
            print(f"[debug] joinedAssister: {self.joinedAssister}")
            
            """
            if assister.closed:
                print(f"[debug/patient] Assister {assister.id} is closed, removing from list")
                self.joinedAssister.remove(assister)
                continue
            """
            try:
                print(f"[debug/patient_object] Sending message to assister {assister.id} for patient {self.patientID}")
                await assister.send(json.dumps({
                    "type": "patientMessage",
                    "message": message,
                    "shorthand": shorthand if shorthand else "patientassist.PATIENT_MESSAGE"
                    }))
                assistersMessaged += 1
            except websockets.exceptions.ConnectionClosed as e:
                print(f"[debug/patient_object] Connection closed interruped sending message to assister {assister.id} ({e})")
                # await self.websocket.send(build_json_response("ERROR_FORWARDING", f"Error sending message to assister {assister.assisterID}"))
                assisterErrs += 1
            except websockets.exceptions.InvalidState as e:
                print(f"[debug/patient_object] Invalid state error sending message to assister {assister.id}: {e}")
                assisterErrs += 1
            except Exception as e:
                print(f"[debug/patient_object] Error sending message to assister {assister.id}: {e}")
                assisterErrs += 1

        print(f"[debug/patient_object] Messaged {assistersMessaged} assisters for patient {self.patientID}")
        return assistersMessaged


class Assister:
    def __init__(self, websocket, pairedPatient=Patient, assisterID=None, friendlyName=None):
        self.assisterID = assisterID
        self.websocket = websocket
        self.pairedPatient = pairedPatient
        self.friendlyName = friendlyName # string that allows reconnecting to a patient that has disconnected

    async def getFriendlyName(self) -> str:
        return self.friendlyName
    
    async def getID(self) -> str:
        print(f"Assister ID: {self.assisterID} but we are using the websocket ID as the unique identifier")
        return self.websocket.id


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
            except TypeError as e:
                print(f"Error parsing message: {e}")
                return await websocket.send(
                    build_json_response("ERROR_PARSING", f"Couldn't parse the message: {e}")
                )

            except Exception as e:
                print(f"Error parsing message: {e}")
                return await websocket.send(
                    build_json_response("ERROR_PARSING", f"Couldn't parse the message, ensure binary data is encoded with utf-8: {e}")
                )

            # TODO: can we swich/case this long if statement instead? There will not be multiple cases for the same message, so this would
            # reduce the number of comparisons needed. (or using elif instead of if for each case?)

            match actualMessage:
                case "ping":  # case for heartbeat
                    if actualMessage == "ping":
                        # TODO: heartbeats don't seem to keep the connection alive on mobile, so will need to have a "reconnect" automatic feature 
                        # thingy on the client, matched somewhere here :)

                        print(f"Received ping from patientID {patientID}")
                        return await websocket.send("pong")

                # If there are no errs, proceed

                case "Hello, server!":
                    print("Matched handshake message from a patient")
                    # Check if the patient with the current patientID is already registered
                    if patientID in patients:
                        print(f"Patient {patientID} is already registered")

                    else:
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

                case "mainButton":
                    print("Matched main button press")

                    # This selection statement must thus also have the PatientID in the JSON so we know which patient sent the message
                    await relay_message_to_assisters(patientID=patientID, shorthand="MAIN_BUTTON_PRESSED")
                
                # TODO: can we get rid of shorthand and just use the passed 'actualMessage' - the relay_message_to_assisters function will
                # handle the actual translation into the UI display message either way, this might be a little unnecessary then

                case "hugButton":
                    print("[MATCHED BUTTON PRESS] Hug button pressed!")
                    await relay_message_to_assisters(patientID=patientID, shorthand="HUG_BUTTON_PRESSED")

                case "stairsButton":
                    print("[MATCHED BUTTON PRESS] Stairs button has been pressed!")
                    await relay_message_to_assisters(patientID=patientID, shorthand="STAIRS_BUTTON_PRESSED")

                case "foodButton":
                    print("[MATCHED BUTTON PRESS] Food button presse")
                    await relay_message_to_assisters(patientID=patientID, shorthand="FOOD_BUTTON_PRESSED")

                case "waterButton":
                    print("[MATCHED BUTTON PRESS] Water button pressed")
                    await relay_message_to_assisters(patientID=patientID, shorthand="WATER_BUTTON_PRESSED")

                # Now handshake message from an assister
                case "assister":
                    print("Matched handshake message from an assister")
                    await websocket.send("success")
                    await websocket.send(f"Current time: {datetime.datetime.now()}")

                # Display list of all patients on the current list to the assister frontend
                case "getAllPatients":
                    print("Matched request for all patients")
                    # await websocket.send(json.dumps(patients))
                    currentPatients = await query_patients()
                    await websocket.send(
                        build_json_response("GETALLPATIENTS_SUCCESS", currentPatients)
                    )

            # Cases for when there are incoming messages that incldue both the code and the message in the message itself (for client simplicity)

            if actualMessage.startswith("renewAssisterConnectionOffline"):
                # Registers an assister to an offline patient.
                print("Matched request for assister to pair the assister to a potentially offline patient")
                friendlyName = actualMessage.split(";")

                if len(friendlyName) != 2:
                    return await websocket.send(build_json_response("ERROR_PARSING", "malformatted request"))
                friendlyName = friendlyName[1]  # Can't believe I forgot to add this line, I'm so dumb

                matchedPatient = False
                for patient in patients:
                    if patients[patient].friendlyName == friendlyName:
                        matchedPatient = True
                        print(f"Found patient with friendly name {friendlyName}")

                        # The websocket parameter is the calling assister's websocket object.

                        resp = await patients[patient].addJoinedAssister(websocket=websocket, allow_offline_patients=True)

                        if (resp):
                            await websocket.send(
                                build_json_response(
                                    "OFFLINE_CONNECT_SUCCESS",
                                    f"Connected to offline patient with friendly name {friendlyName}"
                                    )
                                )

                        else:
                            await websocket.send(
                                build_json_response(
                                    "OFFLINE_CONNECT_FAILED",
                                    "Error connecting to offline patient"
                                    )
                                )
                if not matchedPatient:
                    print(f"No existing patient found with friendly name {friendlyName}")
                    await websocket.send(build_json_response("OFFLINE_CONNECT_FAILED_NONE", f"No existing patient found with friendly name {friendlyName}"))

            if actualMessage.startswith("offlinePatientConnect"):
                # Case for when the websocket is unable to deliver the assister join request to a patient that is offline. In this case,
                # we should still allow the assister to join the aptient and thus receive messages from the patient

                friendlyName = actualMessage.split(";")
                if len(patientID) != 2:
                    return await websocket.send(
                        build_json_response(
                            "ERROR_PARSING", "malformatted request"
                            )
                        )
                
                friendlyName = friendlyName[1]
                print(f"Matched request to connect to offline patient with id {friendlyName}")

                # Iterate over the patients list to find a patient with the same friendly name...
                matchedPatient = False
                for patient in patients:
                    if patients[patient].friendlyName == friendlyName:
                        matchedPatient = True
                        print(f"Found patient with friendly name {friendlyName}")

                        # The websocket parameter is the calling assister's websocket object.

                        resp = await patients[patient].addJoinedAssister(websocket)

                        if (resp):
                            await websocket.send(
                                build_json_response(
                                    "OFFLINE_CONNECT_SUCCESS",
                                    f"Connected to offline patient with friendly name {friendlyName}"
                                    )
                                )

                        else:
                            await websocket.send(
                                build_json_response(
                                    "OFFLINE_CONNECT_FAILED",
                                    "Error connecting to offline patient"
                                    )
                                )

            # [PATIENT] Reconnect a patient's new connection websocket with their old patient object, keeping all associated assisters
            if actualMessage.startswith("patientReconnect"):
                friendlyName = actualMessage.split(";")
                if len(friendlyName) != 2:
                    return await websocket.send(build_json_response("ERROR_PARSING", "malformatted request"))

                friendlyName = friendlyName[1]
                print(f"Matched request to reconnect to patient with friendly name {friendlyName}")

                # find all assisters that have the friendly name, as the patient object may have been deleted
                matchedAssisters = []
                for patient in patients:
                    if patients[patient].friendlyName == friendlyName:
                        print(f"Found patient with friendly name {friendlyName}")
                        # add the assister to the patient's joinedAssister list
                        await patients[patient].addJoinedAssister(websocket)
                        return await websocket.send(build_json_response("RECONNECT_SUCCESS", f"Reconnected to patient with friendly name {friendlyName}"))

            # [PATIENT] Associate a friendly name to a patient object. (determined by datetime in client-side.)
            if actualMessage.startswith("associateNameToPatientObject"):
                try:
                    # get the friendly name from the message
                    parts = actualMessage.split(";")
                    if len(parts) != 2:
                        raise ValueError("Invalid message format for associating friendly name")

                    friendlyName = parts[1]
                    print(f"Matched request to associate a friendly name to a patient object: {friendlyName}")

                    # Iterate over the patients list to find a patient with the same friendly name...
                    iterations = 0
                    matchedPatient = False
                    for patientID, patientObj in patients.items():
                        iterations += 1
                        if patientObj.friendlyName == friendlyName:
                            matchedPatient = True
                            print(f"Found patient {patientObj.patientID} with friendly name {friendlyName}")

                            # ... and if there is, replace the old patient object with the new one
                            patientObj.friendlyName = friendlyName
                            patientObj.websocket = websocket  # Kinda hacky way to replace the old websocket object with the new one, probably shouldn't do this but hope it works
                            patientObj.is_disconnected = False
                            patientObj.disconnected_at = None

                            print(f"Associated friendly name {friendlyName} to patient {patientObj.patientID}")

                            await websocket.send(build_json_response("ASSOCIATE_MATCH_SUCCESS", f"Friendly name {friendlyName} associated successfully to patient {patientObj.patientID}"))

                    if not matchedPatient:
                        print(f"No existing patient found with friendly name {friendlyName}. Assigning the friendly name to the current patient object")
                        patients[patientID].friendlyName = friendlyName
                        print(f"[debug] patients: {patients}")
                        await websocket.send(build_json_response("ASSOCIATE_SUCCESS", f"Friendly name {friendlyName} associated successfully to patient {patientID}"))

                except Exception as e:
                    print(f"Error associating friendly name to patient object: {e}")
                    await websocket.send(build_json_response("ASSOCIATE_ERROR", f"Error associating friendly name to patient object: {e}"))

            # [ASSISTER] Register as a device that can receive incoming messages from a patient. (connects to patient too.)
            if actualMessage.startswith("registerAsAssister"):
                target_patient_id = actualMessage.split(";")
                if len(target_patient_id) != 2:
                    return await websocket.send(build_json_response("ERROR_PARSING", "malformatted request"))
                
                target_patient_id = int(target_patient_id[1])

                print(f"Matched request to register an assister to patient {target_patient_id}")
                try:
                    y = await patients[f'{target_patient_id}'].addJoinedAssister(websocket, allow_offline_patients=True)
                    print(y)
                    if y:
                        await websocket.send(build_json_response("ASSISTER_REGISTERED", f"Assister registered successfully to patient {target_patient_id}"))
                    else:
                        await websocket.send(build_json_response("ASSISTER_REGISTER_FAILED", "Error registering assister"))
                except KeyError as e:
                    print(f"Error registering assister to patient {target_patient_id}: {e}")
                    await websocket.send(build_json_response("ASSISTER_REGISTER_FAILED", f"Error registering assister to non-existent patient {target_patient_id}"))
                except Exception as e:
                    print(f"Error registering assister to patient {target_patient_id}: {e}")
                    await websocket.send(build_json_response("ASSISTER_REGISTER_FAILED", f"Error registering assister to patient {target_patient_id}"))

    except websockets.exceptions.ConnectionClosedError as e:

        # WHY AM I GETTing "Connection closed: sent 1011 (internal error); no close frame received" here? 
        # The connection should not be closed after a valid message is sent?

        print(f"Traceback: {traceback.format_exc()}")
        print(f"Connection closed: {e}")
        if patientID in patients:
            if e.code == 1006:
                current_time = datetime.datetime.now()
                print(f"Patient {patientID} disconnected unexpectedly with code 1006; not removing from patients list [{current_time}]")
                patients[patientID].is_disconnected = True
                patients[patientID].disconnected_at = current_time
                # message all assisters that the patient has disconnected
                await patients[patientID].messageAllAssisters("Patient has disconnected, ths is normal for mobile devices...", "PATIENT_DISCONNECTED")
            else:
                print(f"Removing patient {patientID} from patients list")
                del patients[patientID]
        else:
            print(f"Patient {patientID} not found in patients list")


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


async def relay_message_to_assisters(patientID, shorthand: Optional[str] = "PATIENT_MESSAGE") -> None:
    """
    Transforms and sends a message received by one patient to all registered assisters.

    `patientID` - the ID of the patient who sent the message.
    [optional] `shorthand` - used to determine how the message should be handled by the client. Default is "PATIENT_MESSAGE" but can also be "MAIN_BUTTON_PRESSED"
    """
    print("Relaying message to all assisters")

    print(f"\n[debug] patients: {patients}")

    patient = patients[patientID]

    match shorthand:
        case "MAIN_BUTTON_PRESSED":
            newMessage = "Patient pressed the HELP button!"
        case "HUG_BUTTON_PRESSED":
            newMessage = "The patient wants a hug."
        case "STAIRS_BUTTON_PRESSED":
            newMessage = "The patient needs help with going up or down the stairs."
        case "FOOD_BUTTON_PRESSED":
            newMessage = "Patient wants food!"
        case "WATER_BUTTON_PRESSED":
            newMessage = "Patient needs water - fizzy or still?"
        case _:
            "Patient sent a message!"

    x = await patient.messageAllAssisters(newMessage, shorthand)
    if x is None or x == 0:  # obviously no assisters were found is the same as x being none
        # No assisters found for this patient, return an error message to the patient
        await patient.send(build_json_response("NO_ASSISTERS", "No assisters found for this patient"))
    else:
        await patient.send(build_json_response("FORWARDING_SUCCESS", f"Message relayed successfully to {x} assisters"))


if __name__ == "__main__":
    print("running!")
    asyncio.run(main())
