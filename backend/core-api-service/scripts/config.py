import os

# reads what Docker injects
API_KEY = os.getenv("BINANCE_API_KEY", "")
API_SECRET = os.getenv("BINANCE_API_SECRET", "")

if not API_KEY:
    print("⚠️ WARNING: Binance API Key not found in environment variables")