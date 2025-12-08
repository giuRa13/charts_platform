import sqlite3, sys, time, os
from binance.client import Client
from config import API_KEY, API_SECRET

#DB = "app.db"
DB = os.getenv("DB_PATH", "data/app.db")
client = Client(API_KEY, API_SECRET)
TIMEOUT = 30 
# if Node.js server is currently writing to the DB, Python will wait up to 30 seconds for the lock to release instead of crashing immediately

def get_db_connection():
    conn = sqlite3.connect(DB, timeout=TIMEOUT)
    return conn

def fetch_binance_klines(symbol, interval, start_ts=None):
    """Fetch ALL missing candles starting from start_ts until latest.
    Returns a flat list of klines in chronological order."""
    all_klines = []
    limit = 1000
    now = int(time.time() * 1000)

    while True:
        try:
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": limit,
            }
            if start_ts:
                params["startTime"] = start_ts

            batch = client.get_klines(**params) # 1 batch = 1 to 1000 candles
            if not batch: break

            all_klines.extend(batch)
            last_close = batch[-1][6]  # closeTime
            start_ts = last_close + 1 # Continue from the next millisecond

            # Stop if we reached current time
            if last_close >= now:
                break

        except Exception as e:
            print(f"Error fetching klines: {e}")
            break

    return all_klines


def save_klines_to_db(symbol, interval, klines):
    """Save candles to DB, existing ones are replaced."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Ensure asset exists
    cur.execute("SELECT id FROM assets WHERE symbol = ?", (symbol,))
    asset_id = cur.fetchone()
    if not asset_id:
        cur.execute("INSERT INTO assets (symbol, full_name) VALUES (?, ?)", (symbol, symbol))
        asset_id = cur.lastrowid
    else:
        asset_id = asset_id[0]

    rows_to_insert = []
    now = int(time.time() * 1000)
    # loop through every downloaded candle
    for k in klines:
        open_time = int(k[0])
        close_time = int(k[6])  # candle closeTime

        # Only save closed candles (or past candles)
        if close_time <= now:
            rows_to_insert.append((
                asset_id, 
                open_time, 
                float(k[1]), 
                float(k[2]), 
                float(k[3]), 
                float(k[4]), 
                float(k[5]), 
                interval
            ))

    cur.executemany("""
        INSERT OR REPLACE INTO assets_prices
        (asset_id, date, open, high, low, close, volume, timeframe)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, rows_to_insert)

    conn.commit()
    conn.close()
    print(f"Saved {len(rows_to_insert)} candles for {symbol} [{interval}]")
    #return int(klines[-1][0]) if klines else None


def find_gaps(symbol, interval):
    conn = get_db_connection()
    cur = conn.cursor()

    # Only check last 5000 candles for speed
    cur.execute("""
        SELECT date 
        FROM assets_prices
        WHERE asset_id = (SELECT id FROM assets WHERE symbol = ?)
        AND timeframe = ?
        ORDER BY date DESC LIMIT 5000
    """, (symbol, interval)) 

    rows = [r[0] for r in cur.fetchall()]
    conn.close()

    if len(rows) < 2:
        return []

    # get interval in ms
    tf_map = {"1m": 60000, "5m": 300000, "15m": 900000, "1h": 3600000, "4h": 14400000, "1d": 86400000}
    step = tf_map.get(interval, 60000)
    # Row A: 10:00
    # Row B: 10:01 (Diff 60s -> OK)
    # Row C: 10:05 (Diff 240s -> GAP DETECTED)
    gaps = []
    for i in range(len(rows) - 1):
        # If difference is more than 1 step (allow small jitter)
        if rows[i+1] - rows[i] > step + 1000:
            gaps.append((rows[i] + step, rows[i+1] - step))

    return gaps

def fill_gap(symbol, interval, start_ts, end_ts):
    print(f"Filling gap {start_ts} -> {end_ts}")
    missing = fetch_binance_klines(symbol, interval, start_ts)
    # Filter only candles inside the missing range
    missing = [k for k in missing if start_ts <= int(k[0]) <= end_ts]
    if missing:
        save_klines_to_db(symbol, interval, missing)


def load_history(symbol, interval, start_ts=None):
    klines = fetch_binance_klines(symbol, interval, start_ts)
    if klines:
        save_klines_to_db(symbol, interval, klines)

    gaps = find_gaps(symbol, interval)
    if gaps:
        print("Detected gaps:", gaps)
        for gap_start, gap_end in gaps:
            fill_gap(symbol, interval, gap_start, gap_end)
    else:
        print("No gaps detected.")


if __name__ == "__main__":
    symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "BTCUSDT"
    interval = sys.argv[2] if len(sys.argv) > 2 else "1m"
    start_ts = int(sys.argv[3]) if len(sys.argv) > 3 else None # timestamp of the last candle you have in DB

    load_history(symbol, interval, start_ts)


"""DELETE FROM assets_prices 
WHERE id IN (
    SELECT p.id 
    FROM assets_prices p 
    WHERE p.asset_id = (SELECT id FROM assets WHERE symbol = 'ETHUSDT') 
    AND p.timeframe = '1m' 
    ORDER BY p.date DESC 
    LIMIT 400
);"""