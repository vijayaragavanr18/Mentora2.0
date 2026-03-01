import asyncio
import websockets
import json
import uuid

async def test():
    async with websockets.connect("ws://localhost:5000/ws/chat?chatId=" + str(uuid.uuid4()), ping_interval=None) as ws:
        msg = await ws.recv()
        print("Connected msg:", msg)
        await ws.send(json.dumps({"type": "message", "question": "What is photosynthesis?"}))
        try:
            while True:
                response = await ws.recv()
                print("Response:", response)
                if '"done"' in response or '"error"' in response:
                    break
        except websockets.exceptions.ConnectionClosed as e:
            print("Connection closed by server:", e)

asyncio.run(test())
