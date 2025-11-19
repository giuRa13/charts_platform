import sqlite3, sys
from binance.client import Client
from config import API_KEY, API_SECRET

DB = "app.db"
client = Client(API_KEY, API_SECRET)
MAX_LIMIT = 1000  # Binance max klines per request

def fetch_binance_klines(symbol, interval):
    """Fetch historical klines for a symbol and interval."""
    try:
        klines = client.get_klines(symbol=symbol, interval=interval, limit=MAX_LIMIT)
        return klines
    except Exception as e:
        print(f"Binance fetch error for {symbol} [{interval}]:", e)
        return []

def save_klines_to_db(symbol, interval, klines):
    """Save candles to DB; existing ones are replaced."""
    conn = sqlite3.connect(DB)
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
    for k in klines:
        rows_to_insert.append((
            asset_id,
            int(k[0]),        # timestamp ms
            float(k[1]),      # open
            float(k[2]),      # high
            float(k[3]),      # low
            float(k[4]),      # close
            float(k[5]),      # volume
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

def load_history(symbol, interval):
    """Fetch and save historical data for a symbol and interval."""
    klines = fetch_binance_klines(symbol, interval)
    if klines:
        save_klines_to_db(symbol, interval, klines)


if __name__ == "__main__":
    symbol = sys.argv[1].upper() if len(sys.argv) > 1 else "BTCUSDT"
    interval = sys.argv[2] if len(sys.argv) > 2 else "1m"
    load_history(symbol, interval)