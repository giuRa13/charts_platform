# the Live Listener
# This replaces wss.js logic but specifically for Orderflow. It keeps a buffer and flushes to the DB.
import websocket
import json
import threading
import time
from datetime import datetime
from historical import save_ticks_to_db

SYMBOL = "btcusdt" # Lowercase for WS
WS_URL = f"wss://stream.binance.com:9443/ws/{SYMBOL}@aggTrade"
BUFFER = []
BUFFER_LOCK = threading.Lock()

ws_app = None
is_running = False

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
def run_ws():
    global ws_app
    while is_running:
        ws_app = websocket.WebSocketApp(
            WS_URL,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        ws_app.run_forever()

        # If stopped manually, break loop
        if not is_running:
            break
            
        print("Reconnecting in 2s...")
        time.sleep(2)

def start_ingestor():
    global is_running
    if is_running:
        return "Already running"
    
    is_running = True
    t = threading.Thread(target=run_ws)
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