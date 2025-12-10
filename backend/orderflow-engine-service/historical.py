import time, os
from datetime import datetime
from binance.client import Client
from database import get_db_connection, release_db_connection
from psycopg2.extras import execute_values

# Binance Config (Public endpoints don't strictly need keys, but good to have)
API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
client = Client(API_KEY, API_SECRET)

# Bulk insert ticks into TimescaleDB.
# ticks format: list of (time, symbol, price, quantity, is_buyer_maker)
def save_ticks_to_db(ticks):
    if not ticks: return

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            INSERT INTO market_ticks (time, symbol, price, quantity, is_buyer_maker)
            VALUES %s
            ON CONFLICT DO NOTHING
        """

        execute_values(cursor, query, ticks)
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"Insert Error: {e}")
        if conn: conn.rollback()
    finally:
        if conn: release_db_connection(conn)

def fetch_binance_agg_trades(symbol, start_ts_ms, end_ts_ms=None):
    # Binance allows fetching by startTime/endTime. Max 1 hour window usually.
    print(f"📥 Fetching ticks for {symbol} starting {start_ts_ms}...")

    # Binance limits aggTrades to 1000 per call, or 1 hour window.
    # We loop until we reach end_ts_ms or current time.
    current_start = start_ts_ms
    limit_time = end_ts_ms if end_ts_ms else int(time.time() * 1000)

    total_inserted = 0

    while current_start < limit_time:
        try:
            trades = client.get_aggregate_trades(symbol=symbol, startTime=current_start, limit=1000)

            if not trades:
                # No trades found, maybe jump forward a bit or break
                current_start += 3600000 # Jump 1 hour
                continue

            processed_ticks = []
            max_t = 0
            # 'a': aggTradeId, 'p': price, 'q': quantity, 
            # 'f': firstTradeId, 'l': lastTradeId, 'T': timestamp, 
            # 'm': isBuyerMaker (True = Sell, False = Buy)
            for t in trades:
                ts_obj = datetime.fromtimestamp(t["T" / 1000.0])
                price = float(t["p"])
                qty = float(t["q"])
                is_sell = t["m"]

                processed_ticks.append((ts_obj, symbol, price, qty, is_sell))
                max_t = t["T"]

            save_ticks_to_db(processed_ticks)
            total_inserted += len(processed_ticks)

            # Move pointer forward
            # Binance returns overlapping trades if we use same time. 
            # aggTrades are better iterated by ID, but Time is easier for gap filling.
            current_start = max_t + 1

            # Simple rate limit protection
            time.sleep(0.1)

        except Exception as e:
            print(f"Fetch Error: {e}")
            time.sleep(1)
            break

    print(f"✅ Finished Backfill: {total_inserted} ticks inserted.")

def get_latest_tick_time(symbol):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT max(time) FROM market_ticks WHERE symbol = %s", (symbol,))
    row = cur.fetchone()
    cur.close()
    release_db_connection(conn)

    if row and row[0]:
        return int(row[0].timestamp() * 1000)
    return None

#Main Entry point.
# 1. Check last tick in DB.
# 2. If empty, start from 'minutes_back' ago.
# 3. If exists, start from last tick.
def load_tick_history(symbol, minutes_back=60):
    last_ts = get_latest_tick_time(symbol)
    now = int(time.time() * 1000)

    if not last_ts:
        print("No history found. Starting fresh download...")
        start_ts = now - (minutes_back * 60 * 1000)
    else:
        print("Resuming history download...")
        start_ts = last_ts + 1

    fetch_binance_agg_trades(symbol, start_ts)


if __name__ == "__main__":
    load_tick_history("BTCUSDT", minutes_back=10)