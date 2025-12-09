import time
import os
import json
import psycopg2
import websocket
from psycopg2.extras import execute_values
from datetime import datetime

# --- CONFIG ---
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "orderflow_db")

BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@aggTrade"
BATCH_SIZE = 100 # Insert to DB every 100 ticks (Optimization)

# Global Buffer
tick_buffer = []

def connect_db():
    """Connect to TimescaleDB with retries"""
    while True:
        try:
            conn = psycopg2.connect(
                host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME
            )
            print("✅ Orderflow Engine: Connected to DB!")
            return conn
        except Exception as e:
            print(f"⏳ DB not ready, retrying in 2s... ({e})")
            time.sleep(2)

def init_schema(conn):
    cur = conn.cursor()
    # Create the table for Raw Ticks
    cur.execute("""
        CREATE TABLE IF NOT EXISTS market_ticks (
            time TIMESTAMPTZ NOT NULL,
            symbol TEXT NOT NULL,
            price DOUBLE PRECISION,
            quantity DOUBLE PRECISION,
            is_buyer_maker BOOLEAN
        );
    """)
    # Convert to Hypertable (TimescaleDB magic)
    try:
        cur.execute("SELECT create_hypertable('market_ticks', 'time', if_not_exists => TRUE);")
    except:
        pass # Already exists
    
    conn.commit()
    cur.close()

def flush_buffer(conn):
    """Write buffered ticks to DB in one go"""
    global tick_buffer
    if not tick_buffer:
        return

    cur = conn.cursor()
    query = "INSERT INTO market_ticks (time, symbol, price, quantity, is_buyer_maker) VALUES %s"
    
    try:
        execute_values(cur, query, tick_buffer)
        conn.commit()
        print(f"💾 Saved {len(tick_buffer)} ticks to DB.")
        tick_buffer = [] # Clear buffer
    except Exception as e:
        print(f"❌ Insert Error: {e}")
        conn.rollback() # Important to keep connection alive
    
    cur.close()

# --- WEBSOCKET HANDLERS ---
def on_message(ws, message):
    data = json.loads(message)
    
    # Extract Binance Data
    # 'T' = Trade Time, 'p' = Price, 'q' = Quantity, 'm' = Is Buyer Maker (True = Sell, False = Buy)
    ts = datetime.fromtimestamp(data['T'] / 1000.0)
    price = float(data['p'])
    qty = float(data['q'])
    is_sell = data['m'] # If True, Maker was Buyer -> Taker was Seller -> It's a Sell
    
    # Add to Buffer
    tick_buffer.append((ts, "BTCUSDT", price, qty, is_sell))

    # Batch Insert
    if len(tick_buffer) >= BATCH_SIZE:
        flush_buffer(ws.db_conn)

def on_error(ws, error):
    print(f"WS Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("WS Closed. Reconnecting...")

def on_open(ws):
    print("🟢 Connected to Binance AggTrades")

# --- MAIN ---
if __name__ == "__main__":
    print("🚀 Orderflow Engine Starting...")
    
    # 1. DB Setup
    conn = connect_db()
    init_schema(conn)

    # 2. Start WebSocket
    while True:
        try:
            ws = websocket.WebSocketApp(
                BINANCE_WS,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            # Attach DB connection to WS object so callbacks can access it
            ws.db_conn = conn
            
            ws.run_forever()
        except Exception as e:
            print(f"CRASH: {e}")
            time.sleep(5)



# docker exec -it timescaledb psql -U admin -d orderflow_db 
# \dt
# SELECT COUNT(*) FROM market_ticks;

# docker logs -f orderflow_engine  