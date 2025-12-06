// Format: 2025-11-05 11:00:00, CME_MINI:NQ1!, Open, High, Low, Close, Volume

export const parseCustomCSV = (csvText) => {
    
    const lines = csvText.trim().split("\n");
    const data = [];

    lines.forEach((line, index) => {
        const cleanLine = line.trim();
        if (!cleanLine) return; // Skip empty lines

        const parts = cleanLine.split(",");
        if (parts.length < 6) return; //skip invalid lines

        // Parse Time "2025-11-05 11:00:00" -> Unix Timestamp (Seconds)
        const dateStr = parts[0].trim();
        const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
        if (isNaN(timestamp)) return;

        // Parse OHLCV
        const open = parseFloat(parts[2]);
        const high = parseFloat(parts[3]);
        const low = parseFloat(parts[4]);
        const close = parseFloat(parts[5]);
        // Handle optional volume (default to 0 if missing or NaN)
        const volRaw = parseFloat(parts[6]);
        const volume = isNaN(volRaw) ? 0 : volRaw;

         // If any price is NaN (e.g. malformed line), skip it to prevent Chart Crash
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
            console.warn(`Skipping invalid row ${index}:`, line);
            return;
        }

        data.push({
            time: timestamp,
            open,
            high,
            low,
            close,
            volume
        });
    });

    return data.sort((a, b) => a.time - b.time);
};