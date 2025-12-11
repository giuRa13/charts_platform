# the Live Listener
# This replaces wss.js logic but specifically for Orderflow. It keeps a buffer and flushes to the DB.
import websocket
import json
import threading
import time
import asyncio
from datetime import datetime
from historical import save_ticks_to_db
from processing import aggregator
from connection_manager import manager

SYMBOL = "btcusdt" # Lowercase for WS
WS_URL = f"wss://stream.binance.com:9443/ws/{SYMBOL}@aggTrade"
BUFFER = []
BUFFER_LOCK = threading.Lock()

ws_app = None
is_running = False

# Helper to run async broadcast from sync thread
def broadcast_sync(data):
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.run_coroutine_threadsafe(manager.broadcast(data), loop)

def on_message(ws, message):
    if not is_running: 
        ws.close()
        return
    
    try:
        data = json.loads(message)
        # Extract
        ts = datetime.fromtimestamp(data["T"] / 1000.0)
        price = float(data['p'])
        qty = float(data['q'])
        is_sell = data['m']
        symbol = "BTCUSDT"

        # 1. PROCESS AGGREGATION (Live Update)
        rich_candle = aggregator.process_tick(ts, price, qty, is_sell)

        # 2. Broadcast to frontend
        # need to find the main event loop to send the message
        try:
            if ws.loop:
                asyncio.run_coroutine_threadsafe(manager.broadcast(rich_candle), ws.loop)
        except Exception as e:
            # Loop might be closed or not ready
            pass

        # 3. Save to DB (BATCH)
        with BUFFER_LOCK:
            BUFFER.append((ts, symbol, price, qty, is_sell))
            # Batch insert every 50 ticks
            if len(BUFFER) >= 50:
                save_ticks_to_db(BUFFER)
                BUFFER.clear()
    except Exception as e:
        print(f"WS Msg Error: {e}")

def on_error(ws, error):
    print("WS Error:", error)

def on_close(ws, close_status_code, close_msg):
    print("WS Closed")

def on_open(ws):
    print("🟢 Live Tick Stream Started")

# Run WS in a separate thread so it doesn't block the API
def run_ws(loop):
    global ws_app
    while is_running:
        ws_app = websocket.WebSocketApp(
            WS_URL,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        ws_app.loop = loop # Attach loop to instance
        ws_app.run_forever()
        if not is_running: break # If stopped manually, break loop
        time.sleep(2)

def start_ingestor(loop):
    global is_running
    if is_running:
        return "Already running"
    
    is_running = True
    t = threading.Thread(target=run_ws, args=(loop,))
    t.daemon = True
    t.start()
    return "Started"

def stop_ingestor():
    global is_running, ws_app
    if not is_running:
        return "Already stopped"
    
    is_running = False
    if ws_app:
        ws_app.close() # Close socket to break the run_forever loop
    return "Stopped"