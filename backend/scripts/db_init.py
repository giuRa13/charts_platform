import sqlite3

DB = "app.db"

def init():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS assets_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER,
        date INTEGER NOT NULL,         -- timestamp in ms
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        timeframe TEXT NOT NULL,
        FOREIGN KEY (asset_id) REFERENCES assets (id),
        UNIQUE(asset_id, date, timeframe)
    )
    """)

    # ---- HIGH-PERFORMANCE INDEX ----
    # This makes all SELECTs extremely fast even with hundreds of thousands of rows.
    cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_prices_lookup
        ON assets_prices (asset_id, timeframe, date)
    """)

    conn.commit()
    conn.close()
    print("DB and tables created (or already exist).")

if __name__ == "__main__":
    init()