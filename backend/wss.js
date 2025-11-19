const WebSocket = require("ws");
const db = require("./db");

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (clientWS, req) => {
    console.log("Client connected");

    const params = new URLSearchParams(req.url.replace("/?", ""));
    const symbol = (params.get("symbol") || "BTCUSDT").toLowerCase();
    const timeframe = params.get("timeframe") || "1m";

    const binanceWS = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@kline_${timeframe}`
    );

    binanceWS.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);

        // Forward live candle to client
        if (clientWS.readyState === WebSocket.OPEN) {
          clientWS.send(JSON.stringify(data));
        }

        // Save completed candle to DB
        if (data.k) {
          await db.saveCandles(symbol.toUpperCase(), [
            [
              data.k.t,
              parseFloat(data.k.o),
              parseFloat(data.k.h),
              parseFloat(data.k.l),
              parseFloat(data.k.c),
              parseFloat(data.k.v),
            ],
          ], timeframe);
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    });

    clientWS.on("close", () => {
      console.log("Client disconnected");
      //  if (binanceWS.readyState <= 1) binanceWS.terminate();
      if (
        binanceWS.readyState === WebSocket.OPEN ||
        binanceWS.readyState === WebSocket.CONNECTING
      ) {
        binanceWS.terminate();
      }
    });

    clientWS.on("error", (err) => {
      console.error("Client WS error:", err.message);
    });

    binanceWS.on("error", (err) => {
      if (!err.message.includes("before the connection was established")) {
        console.error("Binance WS error:", err.message);
      }
    });
  });
}

module.exports = { initWebSocket };