import sqlite3
import requests, os

#DB = "app.db"
DB = os.getenv("DB_PATH", "data/app.db")

def populate_assets_table():
    """Fetch all active Binance symbols and populate the assets table."""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    try:
        res = requests.get("https://api.binance.com/api/v3/exchangeInfo")
        res.raise_for_status()
        data = res.json()
        assets = [
            (s["symbol"], f'{s["baseAsset"]}/{s["quoteAsset"]}')
            for s in data["symbols"]
            if s["status"] == "TRADING"
        ]

        for sym, fullname in assets:
            cur.execute(
                "INSERT OR IGNORE INTO assets (symbol, full_name) VALUES (?, ?)",
                (sym, fullname)
            )

        conn.commit()
        print(f"Inserted/updated {len(assets)} assets into DB.")
    except Exception as e:
        print("Failed to populate assets table:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    populate_assets_table()
