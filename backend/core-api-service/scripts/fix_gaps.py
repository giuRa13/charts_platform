import sqlite3
import time
import os


DB_PATH = os.getenv("DB_PATH", "../data/app.db") 

def delete_recent_btc():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    symbol = "BTCUSDT"
    
    # 1. Get Asset ID
    cur.execute("SELECT id FROM assets WHERE symbol = ?", (symbol,))
    row = cur.fetchone()
    if not row:
        print("BTCUSDT not found in DB.")
        return
    
    asset_id = row[0]

    # 2. Calculate Timestamp for "2 Days Ago" (to be safe)
    # 86400 seconds * 2 = 172800 seconds * 1000 = 172800000 ms
    two_days_ago = int(time.time() * 1000) - 172800000

    print(f"Deleting candles for {symbol} after timestamp: {two_days_ago}")

    # 3. Delete bad data
    cur.execute("""
        DELETE FROM assets_prices 
        WHERE asset_id = ? AND date > ?
    """, (asset_id, two_days_ago))

    deleted_count = cur.rowcount
    conn.commit()
    conn.close()

    print(f"Success! Deleted {deleted_count} candles.")
    print("Restart your server/refresh page to re-trigger the download.")

if __name__ == "__main__":
    delete_recent_btc()