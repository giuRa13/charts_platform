# this starts the ingestor(web socket) on boot and exposes an API endpoint for the frontend to trigger a backfill
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import uvicorn
import ingestor
import historical

app = FastAPI()

# Start Live Data on Boot
#@app.on_event("startup")
#async def startup_event():
#    print("🚀 Server B (Orderflow) Starting...")
#    ingestor.start_ingestor()

@app.get("/")
def home():
    return {
        "status": "Orderflow Engine Ready", 
        "ingestor_active": ingestor.is_running
    }

# --- CONTROL ENDPOINTS ---
@app.post("/ingest/start")
def start_ingest(): # Manually start the Binance WebSocket Stream
    status = ingestor.start_ingestor()
    return {"status": status}

@app.post("/ingest/stop")
def stop_ingest():
    status = ingestor.stop_ingestor()
    return {"status": status}

# --- HISTORICAL ---
class AssetRequest(BaseModel):
    symbol: str

@app.post("/load-ticks")
async def load_ticks(req: AssetRequest, background_tasks: BackgroundTasks):
    # Frontend calls this when user switches to an asset in PRO MODE.
    # We trigger a background backfill for the last 60 minutes.
    background_tasks.add_task(historical.load_tick_history, req.symbol, 60)
    return {"status": "Backfill started", "symbol": req.symbol}

@app.get("/health")
def health():
    return {"status": "ok", "service": "Orderflow Engine"}


# WebSockets for frontend streaming will be added here later