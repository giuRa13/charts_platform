# turns raw ticks into "Rich Candles"
# It keeps the current state in memory(RAM). 
# When a new tick arrives, it updates the math. When the minute changes, it resets.
from datetime import datetime

class CandleAggregator:
    def __init__(self):
        self.current_candle = None
        self.last_minute = None

    # Takes a raw tick and updates the current Rich Candle.
    # Returns: The updated Candle Object.
    def process_tick(self, tick_time, price, qty, is_sell):
        # 1. Determine Minute (Unix Timestamp floor)
        minute_ts = int(tick_time.timestamp() // 60) * 60

        # 2. Check for New Candle
        if self.last_minute is None or minute_ts > self.last_minute:
            self.reset_candle(minute_ts, price)

        self.last_minute = minute_ts
        c = self.current_candle

        # 3. Update OHLCV
        c["close"] = price
        if price > c["high"]: c["high"] = price 
        if price < c['low']: c['low'] = price
        c['volume'] += qty

        # 4. Update Delta
        # is_sell=True, it's Sell Volume. is_sell=False, it's Buy Volume
        if is_sell:
            c["delta"] -= qty
        else:
            c["delta"] += qty

        # 5. Update Footprint (Volume Profile inside candle)
        # Key string must be price for JSON compatibility
        p_str = f"{price:.8f}".rstrip('0').rstrip('.') # Normalize price key
        if p_str not in c["footprint"]:
            c["footprint"][p_str] = {"buy":0, "sell":0}

        if is_sell:
            c["footprint"][p_str]["sell"] += qty
        else:
            c['footprint'][p_str]['buy'] += qty

        return c

    # Start a fresh Candle
    def reset_candle(self, timestamp, price):
        self.current_candle = {
            "time": timestamp, # Lightweight Charts expects seconds
            "open": price,
            "high": price,
            "low": price,
            "close": price,
            "volume": 0,

            "delta": 0,
            "footprint": {}
        }

aggregator = CandleAggregator()