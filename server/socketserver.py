import websockets
import asyncio


async def handler(websocket):
    while True:
        message = await websocket.recv()
        print(message)


async def main():
    async with websockets.serve(handler, "", 8001):
        await asyncio.Future()  # run forever


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