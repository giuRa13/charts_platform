/**
 * Calculates TPO Blocks from candlestick data.
 * ( Converting raw linear candles into a 3D structure (Time vs. Price vs. Volume) )
 * 
 * 1. Iterate through all 1-minute candles.
 * 2. Group them by "Trading Day" (UTC).
 * 3. Inside each day, calculate which "30-minute slot" the candle belongs to (A=0-30, B=30-60...).
 * 4. Determine the High and Low of that 30-minute period.
 * 5. Return a structure that tells us where to draw blocks.
 */

export function prepareTPOData(candles, blockSizeInput = 50) {
    if (!candles || candles.length === 0) return [];

    const blockSize = Number(blockSizeInput) || 50;
    const tpoData = {}; 

    // 1. Group Data by Day and calculate Slots
    // anchorIndex:  Instead of saving the Time (which might be off-screen), 
    // we save the Logical Index of the first candle of the day. 
    // This allows the renderer to find the X-coordinate even if you scroll far away
    candles.forEach((candle, index) => {
        const date = new Date(candle.time * 1000);
        const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const dayKey = dayStart.getTime() / 1000;

        if (!tpoData[dayKey]) {
            tpoData[dayKey] = { 
                time: candle.time, 
                anchorIndex: index, // Store the logical index (0, 1, 2...)
                slots: {} 
            };
        }

        // Slot Index (0-47)
        // Example: 10:45 AM ---> (10 * 2) + 1 = Slot 21.
        const slotIndex = (date.getUTCHours() * 2) + (date.getUTCMinutes() >= 30 ? 1 : 0);

        if (!tpoData[dayKey].slots[slotIndex]) {
            tpoData[dayKey].slots[slotIndex] = { high: -Infinity, low: Infinity };
        }
        
        // Aggregation: For every 30-minute slot, we don't care about every 1-minute candle.
        // We only care about the High and Low of that entire 30 minutes
        const slot = tpoData[dayKey].slots[slotIndex];
        slot.high = Math.max(slot.high, candle.high);
        slot.low = Math.min(slot.low, candle.low);
    });

    // 2. Process each Day 
    // convert those 30-minute High/Low ranges into specific "Bricks"
    return Object.values(tpoData).map(dayProfile => {
        const rawBlocks = [];
        const priceCounts = {}; // Key: Price, Value: Count of TPOs
        let totalTPOs = 0;

        Object.entries(dayProfile.slots).forEach(([slotIdx, range]) => {
            // Use Integer Indices to avoid Floating Point errors
            const minIndex = Math.floor(range.low / blockSize); //  convert the price range into Grid Steps
            const maxIndex = Math.floor(range.high / blockSize);

            // Calculate the specific timestamp for this 30m slot (SPLIT feature)
            const profileDate = new Date(dayProfile.time * 1000);
            const dayStartTs = Date.UTC(profileDate.getUTCFullYear(), profileDate.getUTCMonth(), profileDate.getUTCDate()) / 1000;

            const slotTime = dayStartTs + (Number(slotIdx) * 1800); // 30 mins = 1800 seconds

            // iterates from the Low Index to the High Index and creates a block object for every step
            // If the price moved from 100 to 120 in that 30m slot, and block size is 10, it creates blocks at 100, 110, and 120
            for (let i = minIndex; i <= maxIndex; i++) {
                // Recover the price from the index
                // Use Math.round to clean up tiny decimals (e.g. 1900.0000001 -> 1900)
                const price = Math.round((i * blockSize) * 1000000) / 1000000;

                const block = { 
                    price: price, 
                    slotIndex: Number(slotIdx),
                    time: slotTime// store time for split view
                };
                rawBlocks.push(block);

                priceCounts[price] = (priceCounts[price] || 0) + 1;
                totalTPOs++;
            }
        });

        // Find POC (Price with Max TPOs)
        let pocPrice = 0;
        let maxCount = -1;
        // Convert map to array for sorting
        const levels = Object.keys(priceCounts).map(p => Number(p)).sort((a, b) => a - b);
        levels.forEach(p => {
            if (priceCounts[p] > maxCount) {
                maxCount = priceCounts[p];
                pocPrice = p;
            }
        });

        // above / below stats
        let countAbove = 0;
        let countBelow = 0;
        levels.forEach(p => {
            if (p > pocPrice) countAbove += priceCounts[p];
            if (p < pocPrice) countBelow += priceCounts[p];
        });

        // Calculate Value Area (70%)
        const targetVolume = totalTPOs * 0.70;
        let currentVolume = maxCount; // Start with POC volume
        const valueAreaPrices = new Set([pocPrice]);

        // 1.Look at the price directly Above and Below POC
        let upIndex = levels.indexOf(pocPrice) + 1;
        let downIndex = levels.indexOf(pocPrice) - 1;
        // 2. Which one has more volume? Add that one to the group.
        // 3. Repeat until we have captured 70% of the total blocks.
        while (currentVolume < targetVolume) {
            const upPrice = upIndex < levels.length ? levels[upIndex] : null;
            const downPrice = downIndex >= 0 ? levels[downIndex] : null;

            const upCount = upPrice !== null ? priceCounts[upPrice] : 0;
            const downCount = downPrice !== null ? priceCounts[downPrice] : 0;

            // Add the side with more volume first (standard TPO rule)
            if (upCount >= downCount && upPrice !== null) {
                valueAreaPrices.add(upPrice);
                currentVolume += upCount;
                upIndex++;
            }
            else if (downPrice !== null) {
                valueAreaPrices.add(downPrice);
                currentVolume += downCount;
                downIndex--;
            }
            else {
                break;// No more levels
            }
        }

        // Tag Blocks
        const finalBlocks = rawBlocks.map(b => ({
            ...b,
            isPoc: b.price === pocPrice,
            isVA: valueAreaPrices.has(b.price)
        }));

        // extract VAH / VAL for lines
        const vaArray = Array.from(valueAreaPrices);
        const val = Math.min(...vaArray);
        const vah = Math.max(...vaArray);
        
        return {
            time: dayProfile.time,
            anchorIndex: dayProfile.anchorIndex, // Pass index to renderer
            blocks: finalBlocks,
            rowCounts: priceCounts,
            levels: { poc: pocPrice, val, vah }, 
            stats: { 
                above: countAbove, 
                below: countBelow,
                minPrice: levels[0], // Store min price for positioning text
                maxPrice: levels[levels.length - 1] // Store Max Price for collision check (for Naked POC)
            }
        };
    }).sort((a, b) => a.time - b.time);
    // ensures that your Day Profiles are ordered chronologically (Oldest day -> Newest day).
    // Object.values() does not guarantee order
}