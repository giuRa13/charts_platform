const express = require("express");
const { exec, execFile } = require("child_process"); // allows Node.js to run python scripts as if you typed them in the terminal
const path = require("path");
const cors = require("cors");
const db = require("./db");
const { initWebSocket } = require("./wss");

const app = express();
const PORT = 3001;

app.use(express.json());

// allows frontend to talk to this backend without security errors
app.use(cors({
  origin: "http://localhost:5173"
}));

const server = app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);

   const populateScript = path.join(__dirname, "scripts", "load_pairs.py");
    execFile("python", [populateScript], (err, stdout, stderr) => {
        if (err) console.error("Populate assets error:", stderr || err);
        else console.log(stdout);
    });

   db.pruneDatabase();
});

app.get("/assets", async (req, res) => {
    try {
        const rows = await db.runQuery("SELECT symbol, full_name FROM assets ORDER BY symbol ASC");
        res.json(rows);
    } catch (err) {
        console.error("Failed to fetch assets:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/history/:symbol/:timeframe", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = req.params.timeframe;
  try {
    const lastTs = await db.getLatestTimestamp(symbol, timeframe);
    // fetch missing candles via Python
    const pythonScript = path.join(__dirname, "scripts", "load_history.py");
    const args = [symbol, timeframe];
    //if (lastTs) args.push(String(lastTs + 1)); 
    // This makes Python fetch the last candle again and 'INSERT OR REPLACE' it, 
    // fixing any partial data left over from a server crash or old logic.
    if (lastTs) args.push(String(lastTs)); 

    await new Promise((resolve, reject) => {
      execFile("python", [pythonScript, ...args], (err, stdout, stderr) => {
        if (err) {
          console.error("Python error:", stderr || err);
          reject(err);
        } else {
          console.log(stdout);
          resolve();
        }
      });
    });

    // return full history from DB
    const history = await db.getHistory(symbol, timeframe);
    res.json(history);
  } 
  catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: err.message });
  }
});

initWebSocket(server);