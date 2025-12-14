import pandas as pd
from datetime import datetime, timedelta
from database import get_db_connection, release_db_connection
from historical import sync_recent_history, get_latest_tick_time

TIMEFRAME_MAP = {
    "1m": "1Min", "5m": "5Min", 
    "30m": "30Min","1d": "1D"
}

# 1. Checks DB for gaps.
# 2. Downloads missing data if needed.
# 3. Queries DB and aggregates ticks into Rich Candles (OHLCV + Delta + Footprint).
def get_historical_footprints(symbol: str, timeframe: str = "1m", limit: int = 100):
    # --- STEP 1: SMART SYNC ---
    last_tick_ts = get_latest_tick_time(symbol) 
    now_ms = int(datetime.now().timestamp() * 1000)
    
    tf_minutes_map = { "1m": 1, "3m": 3, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440 }
    base_minutes = tf_minutes_map.get(timeframe, 1)
    
    # Cap required download to 60 mins for performance speed (initial load)
    # Background task can fill deeper history later
    required_minutes = min(base_minutes * limit, 60)

    if not last_tick_ts:
        # DB Empty: Download
        sync_recent_history(symbol, minutes=required_minutes)
    else:
        # DB has data: Check gap size
        gap_seconds = (now_ms - last_tick_ts) / 1000
        
        # If gap is > 60 seconds, trigger a sync to catch up
        if gap_seconds > 60:
            missing_mins = int(gap_seconds / 60) + 1
            download_mins = min(missing_mins, required_minutes)
            sync_recent_history(symbol, minutes=download_mins)
    
    # --- STEP 2: QUERY DB ---
    conn = get_db_connection()
    cursor = conn.cursor()

    minutes_lookback = base_minutes * limit

    query = f"""
        SELECT time, price, quantity, is_buyer_maker
        FROM market_ticks
        WHERE symbol = %s
        AND time > NOW() - INTERVAL '{minutes_lookback} minutes' 
        ORDER BY time ASC
    """
    
    cursor.execute(query, (symbol,))
    rows = cursor.fetchall()
    
    cursor.close()
    release_db_connection(conn)

    if not rows: return []

    # --- STEP 3: AGGREGATE ---
    df = pd.DataFrame(rows, columns=["time", "price", "quantity", "is_sell"])
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    
    # Resample to desired timeframe
    freq = TIMEFRAME_MAP.get(timeframe, "1Min")
    grouped = df.groupby(pd.Grouper(freq=freq))

    candles = []

    for timestamp, group in grouped:
        if group.empty: continue
            
        open_ = group['price'].iloc[0]
        close = group['price'].iloc[-1]
        high = group['price'].max()
        low = group['price'].min()
        volume = group['quantity'].sum()

        buy_vol = group.loc[group['is_sell'] == False, 'quantity'].sum()
        sell_vol = group.loc[group['is_sell'] == True, 'quantity'].sum()
        delta = buy_vol - sell_vol

        # Build Footprint Map (Price -> {buy, sell})
        price_groups = group.groupby('price')
        footprint_map = {}

        for price, p_group in price_groups:
            p_buy = p_group.loc[p_group['is_sell'] == False, 'quantity'].sum()
            p_sell = p_group.loc[p_group['is_sell'] == True, 'quantity'].sum()
            
            # Normalize price to string key to avoid floating point errors in JSON
            # e.g. 96000.0000001 -> "96000"
            price_key = f"{price:.8f}".rstrip('0').rstrip('.')
            
            footprint_map[price_key] = {
                "buy": float(p_buy), 
                "sell": float(p_sell)
            }

        candles.append({
            "time": int(timestamp.timestamp()), # Unix Seconds for Lightweight Charts
            "open": float(open_),
            "high": float(high),
            "low": float(low),
            "close": float(close),
            "volume": float(volume),
            "delta": float(delta),
            "footprint": footprint_map
        })

    return candles