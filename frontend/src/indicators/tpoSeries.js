class TPORenderer {
    constructor(chart, series) {
        this._chart = chart;
        this._series = series; // Series API Reference
        this._fullData = [];
        this._options = null;
        this._expandedTimes = new Set(); // Track which specific days are expanded
    }

    draw(target/*, priceConverter, isHovered, hitTestData*/) {
        if (!this._fullData || this._fullData.length === 0 || !this._options || !this._chart || !this._series) return;

        // useMediaCoordinateSpace: gives a high-resolution canvas contex
        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            //const blockPixelWidth = 8; 
            const blockPixelWidth = Number(this._options.blockWidth) || 8;
            const gap = 1;
            const blockSize = Number(this._options.blockSize) || 50;
            //const isExpanded = this._options.expand; 
            const timeScale = this._chart.timeScale();
            //const priceScale = this._chart.priceScale('right');

            ctx.save();

            this._fullData.forEach(dayProfile => {
                // If Global Expand is TRUE: Set entry means "Collapse this one"
                // If Global Expand is FALSE: Set entry means "Expand this one"
                // use !== (XOR) to achieve this toggle behavior
                const isGlobalExpanded = this._options.expand === true;
                const isLocalToggle = this._expandedTimes.has(dayProfile.time);
                const isExpanded = isGlobalExpanded !== isLocalToggle

                // 1. Calculate Day Center X (for Merged view & Lines)
                let dayStartX = null;
                if (dayProfile.anchorIndex !== undefined) {
                    // try finds the pixel X position of the start of the day.
                    dayStartX = timeScale.logicalToCoordinate(dayProfile.anchorIndex);
                } else {
                    dayStartX = timeScale.timeToCoordinate(dayProfile.time);
                }

                // Save state for Hit Test to use later
                dayProfile._drawParams = { x: dayStartX, isExpanded };

                // If expanded, calculate X per block, but check day visibility first to optimize
                if (!isExpanded && dayStartX === null) return;

                const levelCounts = {};

                // 2. Draw Blocks
                dayProfile.blocks.forEach(block => {
                    const price = Number(block.price);

                    // --- LOGIC SPLIT ---
                    let x = 0;
                    if (isExpanded) {
                        // SPLIT MODE: Position based on the block's specific 30m time slot
                        const slotX = timeScale.timeToCoordinate(block.time);
                        if (slotX === null) return; // Slot off-screen
                        x = slotX;
                    } else {
                        // MERGED MODE: Position based on stack count from day start
                        const stackIndex = levelCounts[price] || 0;
                        levelCounts[price] = stackIndex + 1; // For every block at Price 90000, increment stackIndex
                        if (dayStartX === null) return;
                        x = dayStartX + (stackIndex * blockPixelWidth); // pushes the block to the right, ( creating the "bell curve" shape sideways )
                    }

                    // Common Y Calculation
                    const yTop = this._series.priceToCoordinate(price + blockSize);
                    const yBottom = this._series.priceToCoordinate(price);
                    if (yBottom === null || yTop === null) return;

                    let height = Math.abs(yBottom - yTop);
                    if (height < 1) height = 1; 

                    const drawY = Math.min(yTop, yBottom);

                    if (block.isPoc) {
                        ctx.fillStyle = this._options.colorPOC || "#db8d1f";
                    }
                    else if (block.isVA) {
                        ctx.fillStyle = this._options.colorVA || "#bababa";
                    }
                    else {
                        ctx.fillStyle = this._options.colorNormal || "#00378f";
                    }

                    ctx.fillRect(x, drawY, blockPixelWidth - gap, height - gap > 0 ? height - gap : height);
                });

                // Draw Lines & Stats (ONLY IN MERGED MODE)
                if (!isExpanded) {
                    if (dayStartX === null) return;

                    if (this._options.showLines && dayProfile.levels) {
                        let endX = null;
                        const nextProfile = this._fullData[this._fullData.indexOf(dayProfile) + 1];
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
                            endX = dayStartX + 300; // fallback width if today
                        }

                        const drawLine = (price, color, lineWidth = 1) => {
                            const y = this._series.priceToCoordinate(price);
                            if (y !== null) { 
                                ctx.beginPath();
                                ctx.strokeStyle = color;
                                ctx.lineWidth = lineWidth;
                                ctx.moveTo(dayStartX, y);
                                ctx.lineTo(endX, y);
                                ctx.stroke();
                            }
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
                                const xText = dayStartX - 8; // 4px padding to the left of the start

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
                                const xStat = dayStartX; 
                                const yStatStart = yBottomProfile + 15; // 15px below lowest block

                                ctx.font = '12px sans-serif';
                                ctx.fillText(`Above: ${dayProfile.stats.above}`, xStat, yStatStart);
                                ctx.fillText(`Below: ${dayProfile.stats.below}`, xStat, yStatStart + 12);
                            }
                        }
                    }
                }
            });
            ctx.restore();
        });
    }

    // Hit Test for Mouse Interaction
    hitTestProfile(x) {
        if (!this._fullData || !this._chart) return null;

        // Iterate profiles to find if x,y matches one
        // only check the "Header" area (top of the profile) or the whole body
        for (const profile of this._fullData) {
            if (!profile._drawParams) continue;

            // 1. Find X Bounds
            const { x: dayStartX, isExpanded } = profile._drawParams;
            if (dayStartX === null || dayStartX === undefined) continue;

            // Approximate width of the Profile: 50 blocks * 6px = 300px (or dynamic based on volume)
            // A safe hit area is usually the startX + some reasonable pixel width (e.g. 150px or 200px)
            const width = 200; 

            if (x >= dayStartX && x <= dayStartX + width) {
                // Check Y: Is mouse vertically within the profile range?
                // return the match if X aligns, chart interaction is usually X-based
                    
                return {
                    ...profile, // stats, time, levels, etc.
                    isExpanded: isExpanded
                };
            }
        }
        return null; 
    }

    toggleSplit(time) {
        if (this._expandedTimes.has(time)) {
            this._expandedTimes.delete(time);
        } else {
            this._expandedTimes.add(time);
        }
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
            blockWidth: 8,
            showCounts: true,
            showLines: true,
            expand: false, // Global setting
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

    toggleSplit(time) {
        this._renderer.toggleSplit(time);
    }

    hitTest(x, y) {
        return this._renderer.hitTestProfile(x, y);
    }
}