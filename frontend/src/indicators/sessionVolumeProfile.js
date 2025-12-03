
export function prepareVPData(candles, rowSizeInput = 10, vaPctInput = 70) {
    if(!candles || candles.length === 0) return [];

    const rowSize = Number(rowSizeInput) || 10;
    const vaPercentage = (Number(vaPctInput) || 70) / 100;
    const vpData = {};

    // 1. Group Data by Day ////////////////////////////////////////////////////////
    candles.forEach((candle, index) => {
        const date = new Date(candle.time * 1000);
        const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const dayKey = dayStart.getTime() / 1000;

        if (!vpData[dayKey]) {
            vpData[dayKey] = {
                time : candle.time,
                anchorIndex: index,
                rows: {}, // key: Price, value: Volume
                totalVolume : 0,
                maxVolume: 0
            };
        }

        const day = vpData[dayKey];

        // Distribute Volume /////////////////////////////////////////////////////////////////////////
        // take the candle's volume and split it evenly across every price row between the Candle High and Candle Low
        const topRowIndex = Math.floor(candle.high / rowSize);
        const bottomRowIndex = Math.floor(candle.low / rowSize);

        const totalRows = (topRowIndex - bottomRowIndex) + 1; // how many rown this candle cover
        const volumePerRow = candle.volume / totalRows; //  Split volume evenly

        // Add volume to every row touched by this candle
        for (let i = bottomRowIndex; i <= topRowIndex; i++) {
            // Reconstruct price from index to avoid float drift
            const price = Math.round((i * rowSize) * 10000000) / 10000000;  // Use Math.round trick to handle float precision (like 0.0001 for forex)

            day.rows[price] = (day.rows[price] || 0) + volumePerRow;

            if (day.rows[price] > day.maxVolume) {
                day.maxVolume = day.rows[price];
            }
        }
        day.totalVolume += candle.volume;
    });

    // 2. Calculate POC ///////////////////////////////////////////////////////
    return Object.values(vpData).map(profile => {
        const rowsArr = [];
        let pocPrice = 0;
        let maxVol = 0;

        // Convert object to array
        Object.entries(profile.rows).forEach(([priceStr, vol]) => {
            const price = Number(priceStr);
            if (vol > maxVol) {
                maxVol = vol;
                pocPrice = price;
            }
            rowsArr.push({price, vol});
        });

        // Sort by price for VA Calculation
        rowsArr.sort((a, b) => a.price - b.price);

        // Calculte Stats ///////////////////////////////////////////////////////////////
        let volAbove = 0;
        let volBelow = 0;
        rowsArr.forEach(r => {
            if(r.price > pocPrice) volAbove += r.vol;
            if (r.price < pocPrice) volBelow += r.vol;
        });

        // Value Area ///////////////////////////////////////////////////////////////
        const targetVol = profile.totalVolume * vaPercentage;
        let currentVol = maxVol;
        const vaPrices = new Set([pocPrice]);

        const pocIndex = rowsArr.findIndex(r => r.price === pocPrice); 
        let upIndex = pocIndex + 1;
        let downIndex = pocIndex - 1;

        while (currentVol < targetVol) {
            const upRow = rowsArr[upIndex];
            const downRow = rowsArr[downIndex];

            const upVol = upRow ? upRow.vol : 0;
            const downVol = downRow ? downRow.vol : 0;

            if (upVol >= downVol && upRow) {
                vaPrices.add(upRow.price);
                currentVol += upVol;
                upIndex++;
            }
            else if (downRow) {
                vaPrices.add(downRow.price);
                currentVol += downVol;
                downIndex--;
            }
            else {
                break;
            }
        }

        // Tag rows
        const finalRows = rowsArr.map(r => ({
            ...r,
            isPoc: r.price === pocPrice,
            isVA: vaPrices.has(r.price)
        }));

        const vaArray = Array.from(vaPrices);
        const val = Math.min(...vaArray);
        const vah = Math.max(...vaArray);

        // Calculate Min/Max Price for Naked POC logic ---
        const minPrice = rowsArr.length > 0 ? rowsArr[0].price : 0;
        const maxPrice = rowsArr.length > 0 ? rowsArr[rowsArr.length - 1].price : 0;

        return{
            time: profile.time,
            anchorIndex: profile.anchorIndex,
            rows: finalRows,
            maxVolume: profile.maxVolume, // for scaling width
            totalVolume: profile.totalVolume,
            levels: { poc: pocPrice, val, vah } ,
            stats: {
                above: Math.round(volAbove),
                below: Math.round(volBelow),
                maxPrice: maxPrice,
                minPrice: minPrice,
                textMinPrice: rowsArr.length > 0 ? rowsArr[0].price : 0 // For positioning bottom text
            }
        }
    }).sort((a,b) => a.time - b .time);
};