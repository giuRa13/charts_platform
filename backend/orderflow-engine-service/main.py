# this starts the ingestor(web socket) on boot and exposes an API endpoint for the frontend to trigger a backfill
from fastapi import FastAPI, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel
import uvicorn
import asyncio
import ingestor
import historical
from connection_manager import manager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (or use ["http://localhost:5173"])
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allow all headers
)

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

# --- WEBSOCKET ENDPOINT ---------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # frontend connects here: ws://localhost:8000/ws
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except:
        manager.disconnect(websocket)

# --- CONTROL ENDPOINTS ----------------------------------
@app.post("/ingest/start")
async def start_ingest(): 
    # Pass the running event loop to the thread so it can broadcast back
    loop = asyncio.get_running_loop()
    status = ingestor.start_ingestor(loop)
    return {"status": status}

@app.post("/ingest/stop")
async def stop_ingest():
    status = ingestor.stop_ingestor()
    return {"status": status}

# --- HISTORICAL -------------------------------------------
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