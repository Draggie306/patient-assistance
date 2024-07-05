import websockets
import asyncio
import datetime
import time
import typing
import json

patients = {}
assisters = {}


async def handler(websocket) -> None:
    while True:
        message = await websocket.recv()

        if message == "Hello, server!":
            print("Matched handshake message from a patient")
            await websocket.send("success")
            await websocket.send(f"Current time: {datetime.datetime.now()}")
            patients[websocket] = time.time()

        if message == "assister":
            print("Matched handshake message from an assister")
            await websocket.send("success")
            await websocket.send(f"Current time: {datetime.datetime.now()}")
            assisters[websocket] = time.time()

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