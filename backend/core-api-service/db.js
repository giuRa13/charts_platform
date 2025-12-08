const sqlite3 = require("sqlite3");
const path = require("path");

//const DB_PATH = path.join(__dirname, "app.db");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');
// Set a busy timeout so Node waits if Python is writing
const db = new sqlite3.Database(DB_PATH);
db.configure("busyTimeout", 5000); 

// -----------------------
// Promisified helpers
// -----------------------
function dbAll(sql, params = []) {
    console.log("DB QUERY:", sql, params);
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    console.log("DB QUERY:", sql, params);
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function runQuery(sql, params = []) {
    return await dbAll(sql, params);
}

// -----------------------
// Database functions
// -----------------------
async function getHistory(symbol, timeframe = "1m") {
    return await dbAll(
        `SELECT p.date/1000 AS time, p.open, p.high, p.low, p.close, p.volume
         FROM assets_prices p
         JOIN assets a ON p.asset_id = a.id
         WHERE a.symbol = ? AND p.timeframe = ?
         ORDER BY p.date ASC`,
        [symbol, timeframe]
    );
}

async function getLatestTimestamp(symbol, timeframe = "1m") {
    const row = await dbGet(
        `SELECT MAX(p.date) as last
         FROM assets_prices p
         JOIN assets a ON p.asset_id = a.id
         WHERE a.symbol = ? AND p.timeframe = ?`,
        [symbol, timeframe]
    );
    return row?.last || null;
}

const assetCache = {}; // key = symbol, value = id

async function saveCandles(symbol, candles, timeframe = "1m") {
    let asset_id = assetCache[symbol];
    if (!asset_id) {
        let row = await dbGet("SELECT id FROM assets WHERE symbol = ?", [symbol]);
        if (!row) {
            await dbRun(
                "INSERT INTO assets (symbol, full_name) VALUES (?, ?)",
                [symbol, symbol]
            );
            row = await dbGet("SELECT id FROM assets WHERE symbol = ?", [symbol]);
        }
        asset_id = row.id;
        assetCache[symbol] = asset_id; // cache it
    }

    /*const stmt = db.prepare(`
        INSERT OR REPLACE INTO assets_prices
        (asset_id, date, open, high, low, close, volume, timeframe)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return new Promise((resolve, reject) => {
        for (const c of candles) {
            stmt.run(asset_id, ...c, timeframe);
        }
        stmt.finalize(err => {
            if (err) reject(err);
            else resolve();
        });
    });*/
    // Use Transaction for speed and safety
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            const stmt = db.prepare(`
                INSERT OR REPLACE INTO assets_prices
                (asset_id, date, open, high, low, close, volume, timeframe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const c of candles) {
                stmt.run(asset_id, ...c, timeframe);
            }

            stmt.finalize();

            db.run("COMMIT", (err) => {
                if (err) {
                    console.error("Transaction commit failed", err);
                    db.run("ROLLBACK");
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

function pruneDatabase(limit = 500_000) {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) AS count FROM assets_prices", (err, row) => {
            if (err) return reject(err);

            const total = row.count;
            if (total <= limit) {
                console.log("DB size is OK:", total);
                return resolve();
            }

            const toDelete = total - limit;
            console.log(`Pruning ${toDelete} oldest rows...`);

            db.run(
                `DELETE FROM assets_prices
                 WHERE id IN (
                     SELECT id FROM assets_prices
                     ORDER BY date ASC
                     LIMIT ?
                 )`,
                [toDelete],
                err => {
                    if (err) return reject(err);
                    console.log("DB prune finished.");
                    resolve();
                }
            );
        });
    });
}

module.exports = {
    db,
    runQuery,
    getHistory,
    saveCandles,
    getLatestTimestamp,
    pruneDatabase,
};