export function prepareFootprintData(candles, rowSize = 0.5) {
    if (!candles || candles.length === 0) return [];

    return candles.map(candle => {
       
        const item = {
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            rows: {} 
        };

        if (candle.footprint) {
            Object.entries(candle.footprint).forEach(([priceStr, volumeObj]) => {
                const rawPrice = Number(priceStr);
                // Aggregate: Snap price to nearest rowSize
                // e.g. 100.1, 100.2 -> 100.0 (if rowSize is 1)
                const priceRow = Math.floor(rawPrice / rowSize) * rowSize;
                // fix float precision issues
                const key = Math.round(priceRow * 10000000) / 10000000;

                if (!item.rows[key]) {
                    item.rows[key] = {buy:0, sell:0, vol:0};
                }

                item.rows[key].buy += volumeObj.buy;
                item.rows[key].sell += volumeObj.sell;
                item.rows[key].vol += (volumeObj.buy + volumeObj.sell);
            });
        }
        return item;
    });
};