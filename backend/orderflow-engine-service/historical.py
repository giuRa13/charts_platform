import time
import os
from datetime import datetime
from binance.client import Client
from database import get_db_connection, release_db_connection
from psycopg2.extras import execute_values

TIMEFRAME_MAP = {
    "1m": "1Min", "3m": "3Min", "5m": "5Min", 
    "15m": "15Min", "30m": "30Min", 
    "1h": "1H", "4h": "4H", "1d": "1D"
}

API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
client = Client(API_KEY, API_SECRET)

#Bulk insert ticks into TimescaleDB.
def save_ticks_to_db(ticks):
    if not ticks: return

    conn = get_db_connection()
    cursor = conn.cursor()
    # "ON CONFLICT DO NOTHING" ensures we don't crash on duplicates
    query = """
        INSERT INTO market_ticks (time, symbol, price, quantity, is_buyer_maker)
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    try:
        execute_values(cursor, query, ticks)
        conn.commit()
    except Exception as e:
        print(f"Insert Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        release_db_connection(conn)

# Finds the timestamp of the very last tick stored in the DB.
def get_latest_tick_time(symbol):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT max(time) FROM market_ticks WHERE symbol = %s", (symbol,))
        row = cur.fetchone()
        if row and row[0]:
            # Convert Postgres Timestamptz to Unix Milliseconds
            return int(row[0].timestamp() * 1000)
    except Exception as e:
        print(f"DB Read Error (Table might not exist yet): {e}")
        conn.rollback()
    finally:
        cur.close()
        release_db_connection(conn)
    return None

# Determines smart start time.
# If DB has recent data, resume from there.
# If DB is empty or stale (>24h old), start fresh from 'minutes_back'.
def get_safe_start_time(symbol, minutes_back):
    now = int(time.time() * 1000)
    target_start = now - (minutes_back * 60 * 1000)
    
    last_db_ts = get_latest_tick_time(symbol)
    
    # Case 1: DB Empty
    if not last_db_ts:
        return target_start
        
    # Case 2: DB Stale (Data is older than 24 hours)
    # We ignore old data to avoid trying to backfill years of history
    if last_db_ts < (now - 86400000):
        print(f"⚠️ DB data is stale ({datetime.fromtimestamp(last_db_ts/1000)}). Skipping gap fill.")
        return target_start

    # Case 3: Good Data
    print(f"   -> Resuming from {datetime.fromtimestamp(last_db_ts/1000)}")
    return last_db_ts + 1

# Blocking function to ensure data exists up to NOW.
def sync_recent_history(symbol, minutes=30):
    print(f"⚡ Instant Sync: Ensuring last {minutes} minutes for {symbol}...")
    start_ts = get_safe_start_time(symbol, minutes)
    
    # Safety fallback
    if not start_ts: 
        start_ts = int(time.time() * 1000) - (minutes * 60000)
    
    fetch_binance_agg_trades(symbol, start_ts)

# Background task entry point
def load_tick_history(symbol, minutes_back=60):
    sync_recent_history(symbol, minutes_back)

# Fetches aggTrades in batches of 1000.
def fetch_binance_agg_trades(symbol, start_ts_ms, end_ts_ms=None):
    current_start = int(start_ts_ms)
    limit_time = int(end_ts_ms) if end_ts_ms else int(time.time() * 1000)

    if current_start >= limit_time:
        print("   -> Data is up to date.")
        return

    loop_count = 0
    max_loops = 50000 
    total_downloaded = 0

    print(f"   -> Fetching {symbol} from {datetime.fromtimestamp(current_start/1000)} to {datetime.fromtimestamp(limit_time/1000)}")

    while current_start < limit_time and loop_count < max_loops:
        loop_count += 1
        try:
            trades = client.get_aggregate_trades(symbol=symbol, startTime=current_start, limit=1000)
            
            if not trades:
                print(f"      [!] No trades at {current_start}, jumping 1 min...")
                current_start += 60000 
                continue

            processed_ticks = []
            
            # Initialize max_t to current_start.
            # This prevents it from resetting to 0 if the loop is skipped or breaks early.
            max_t = current_start

            for t in trades:
                t_val = int(t['T'])
                
                if t_val > limit_time: 
                    max_t = t_val
                    break 

                p_val = float(t['p'])
                q_val = float(t['q'])
                is_sell = bool(t['m'])
                ts_obj = datetime.fromtimestamp(t_val / 1000.0)
                
                processed_ticks.append((ts_obj, symbol, p_val, q_val, is_sell))
                
                # Track the latest time seen in this batch
                if t_val > max_t:
                    max_t = t_val

            if processed_ticks:
                save_ticks_to_db(processed_ticks)
                total_downloaded += len(processed_ticks)

            # Update pointer for next loop
            if max_t > current_start:
                 current_start = max_t + 1
            else:
                 # Force jump to avoid infinite loop if API returns stuck data
                 current_start += 1000

            if current_start >= limit_time:
                break
                
            time.sleep(0.02) # Respect rate limits

        except Exception as e:
            print(f"⚠️ Fetch Warning: {e}")
            time.sleep(1)
            
    print(f"✅ Sync Complete. Downloaded {total_downloaded} ticks.")