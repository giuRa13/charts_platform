class TPORenderer {
    constructor(chart, series) {
        this._chart = chart;
        this._series = series; // Series API Reference
        this._fullData = [];
        this._options = null;
    }

    draw(target/*, priceConverter, isHovered, hitTestData*/) {
        if (!this._fullData || this._fullData.length === 0 || !this._options || !this._chart || !this._series) return;

        // useMediaCoordinateSpace: gives a high-resolution canvas contex
        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            const blockPixelWidth = 6; 
            const gap = 1;
            const blockSize = Number(this._options.blockSize) || 50;
            const timeScale = this._chart.timeScale();
            //const priceScale = this._chart.priceScale('right');

            ctx.save();

            // Iterate through profiles
            for(let i = 0; i < this._fullData.length; i++) {
                const dayProfile = this._fullData[i];

                // 1. Calculate X ( finds the pixel X position of the start of the day )
                let centerX = null;
                if (dayProfile.anchorIndex !== undefined) {
                    // try finds the pixel X position of the start of the day.
                    centerX = timeScale.logicalToCoordinate(dayProfile.anchorIndex);
                } else {
                    centerX = timeScale.timeToCoordinate(dayProfile.time);
                }

                if (centerX === null) continue;
                // checks if the profile is off-screen. If yes, it stops immediately to save CPU
                if (centerX < -500 || centerX > scope.mediaSize.width + 500) continue;

                // 2. Draw Blocks
                const levelCounts = {};
                dayProfile.blocks.forEach(block => {
                    const price = Number(block.price);
                    const stackIndex = levelCounts[price] || 0;
                    levelCounts[price] = stackIndex + 1;
                    // For every block at Price 90000, increment stackIndex

                    if (block.isPoc) {
                        ctx.fillStyle = this._options.colorPOC || "#db8d1f";
                    }
                    else if (block.isVA) {
                        ctx.fillStyle = this._options.colorVA || "#bababa";
                    }
                    else {
                        ctx.fillStyle = this._options.colorNormal || "#00378f";
                    }

                    // Use the Series API to convert price
                    // This is 100% reliable as it uses the series' own scale binding
                    const yTop = this._series.priceToCoordinate(price + blockSize);
                    const yBottom = this._series.priceToCoordinate(price);
                    
                    if (yBottom === null || yTop === null) return;

                    let height = Math.abs(yBottom - yTop);
                    if (height < 1) height = 1; 
                    
                    // pushes the block to the right, ( creating the "bell curve" shape sideways )
                    const x = centerX + (stackIndex * blockPixelWidth);
                    const drawY = Math.min(yTop, yBottom);

                    ctx.fillRect(x, drawY, blockPixelWidth - gap, height - gap > 0 ? height - gap : height);
                });

                // Draw Lines (VAH, VAL, POC)
                if (this._options.showLines && dayProfile.levels) {
                    let endX = null;
                    const nextProfile = this._fullData[i + 1];
                    //looks ahead to this._fullData[i+1] (The next day) to figure out where to stop the line

                    if (nextProfile) {
                        if (nextProfile.anchorIndex !== undefined) {
                            endX = timeScale.logicalToCoordinate(nextProfile.anchorIndex);
                        } else {
                            endX = timeScale.timeToCoordinate(nextProfile.time);
                        }
                    }

                    // Logic: If next profile coordinate is valid, stop 40px before it.
                    // If not valid (future), extend to current right edge
                    if (endX !== null) {
                        endX = endX - 40; // Padding
                    } else {
                        // Current day: Extend to right edge of chart or last bar
                        endX = centerX + 300; // fallback width if today
                    }

                    const drawLine = (price, color, lineWidth = 1) => {
                        const y = this._series.priceToCoordinate(price);
                        if (y === null) return;
                        
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = lineWidth;
                        ctx.moveTo(centerX, y);
                        ctx.lineTo(endX, y);
                        ctx.stroke();
                    };

                    drawLine(dayProfile.levels.val, this._options.colorVA || "#bababa");
                    drawLine(dayProfile.levels.vah + blockSize, this._options.colorVA || "#bababa");
                    drawLine(dayProfile.levels.poc + (blockSize / 2), this._options.colorPOC || "#db8d1f", 3);
                    //drawLine(dayProfile.levels.poc, this._options.colorPOC || "#FFD700", 10);
                }

                // Draw Stats
                if (this._options.showCounts) {
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = this._options.colorText; 

                    // 3. Draw Row Counts
                    if ( dayProfile.rowCounts) {
                        Object.entries(dayProfile.rowCounts).forEach(([priceStr, count]) => {
                            const price = Number(priceStr);
                                
                            const yTop = this._series.priceToCoordinate(price + blockSize);
                            const yBottom = this._series.priceToCoordinate(price);
                                
                            if (yBottom === null || yTop === null) return;

                            // Only draw text if rows are tall enough to read
                            if (Math.abs(yBottom - yTop) < 6) //return;
                                ctx.font = '4px sans-serif';

                            if (Math.abs(yBottom - yTop) < 3) return;

                            const yMid = (yTop + yBottom) / 2;
                            const xText = centerX - 8; // 4px padding to the left of the start

                            ctx.fillText(count, xText, yMid);
                        });
                    }

                    // Draw Above/Below Stats (Bottom)
                    if (dayProfile.stats) {
                        const yBottomProfile = this._series.priceToCoordinate(dayProfile.stats.minPrice);
                        
                        if (yBottomProfile !== null) {
                            ctx.textAlign = 'left';
                            ctx.fillStyle = this._options.colorText; 
                            
                            // Align text with start of profile
                            const xStat = centerX; 
                            const yStatStart = yBottomProfile + 15; // 15px below lowest block

                            ctx.font = '12px sans-serif';
                            ctx.fillText(`Above: ${dayProfile.stats.above}`, xStat, yStatStart);
                            ctx.fillText(`Below: ${dayProfile.stats.below}`, xStat, yStatStart + 12);
                        }
                    }
                }
            };
            ctx.restore();
        });
    }

    // This stores the data for the 'draw' loop to use
    updateData(data) { this._fullData = data; }

    updateOptions(options) { this._options = options; }

    // Setter for Series API
    setSeriesApi(seriesApi) { this._series = seriesApi; }
}


export class TPOSeries {
    constructor(chart) {
        this._renderer = new TPORenderer(chart, null); // Series is null initially
        this._options = { 
            colorNormal: "#00378f", 
            colorVA:  "#bababa", 
            colorPOC: "#db8d1f",
            colorText: "#B2B5BE",
            blockSize: 50,
            showCounts: true,
            showLines: true,
            lastValueVisible: false,
            priceLineVisible: false
        };
        this._renderer.updateOptions(this._options);
    }

    renderer() { return this._renderer; }

    // ... [priceValueBuilder, isWhitespace, defaultOptions match previous code] ...
    
    priceValueBuilder(plotRow) {
        if (!plotRow.blocks || plotRow.blocks.length === 0) return null;
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < plotRow.blocks.length; i++) {
            const p = plotRow.blocks[i].price;
            if (p < min) min = p;
            if (p > max) max = p;
        }
        return [min, max, plotRow.blocks[plotRow.blocks.length - 1].price]; 
    }

    isWhitespace(data) { return !data.blocks || data.blocks.length === 0; }

    defaultOptions() { return this._options; }

    // pass "_fullData" to TPORenderer
    setFullData(data) { this._renderer.updateData(data); }

    // Call this immediately after creating the series
    setSeries(seriesApi) {
        this._renderer.setSeriesApi(seriesApi);
    }

    update(data, options) {
        if (options) {
            this._options = { ...this._options, ...options };
            this._renderer.updateOptions(this._options);
        }
    }
    
    applyOptions(options) { this.update(null, options); }
}