// draws horizontal bars.
// Width: Proportional to volume (vol / maxVolume).
// Color: Different for Value Area vs. Non-Value Area.

const formatVol = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toString();
};

class VPRenderer {
    constructor(chart) {
        this._chart = chart;
        this._series = null; // Will be set via setSeriesApi
        this._fullData = [];
        this._options = null;
    }

    draw(target) {
        if (!this._fullData || this._fullData.length === 0 || !this._options || !this._chart || !this._series) return;

        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            const rowSize = Number(this._options.rowSize) || 10;
            const widthScale = Number(this._options.width) || 100;
            const timeScale = this._chart.timeScale();
            const xOffset = Number(this._options.xOffset) || 0;

            ctx.save();

            this._fullData.forEach((profile, i )=> {
                // 1. Calculate X Start (Day Start)
                let xStart = null;
                if (profile.anchorIndex !== undefined) {
                    xStart = timeScale.logicalToCoordinate(profile.anchorIndex);
                }
                else {
                    xStart = timeScale.timeToCoordinate(profile.time);
                }

                if (xStart === null) return;
                const drawX = xStart + xOffset;
                // Check if the DRAWING position is off-screen
                if (drawX < -widthScale || drawX > scope.mediaSize.width) return;

                // 2. Draw Rows
                if (profile.rows) {
                    profile.rows.forEach(row => {
                        // Y Coords
                        const yTop = this._series.priceToCoordinate(row.price + rowSize);
                        const yBottom = this._series.priceToCoordinate(row.price);

                        if (yBottom === null || yTop === null) return;

                        let height = Math.abs(yBottom - yTop);
                        if (height < 1) height = 1;
                        const drawY = Math.min(yTop, yBottom);

                        // width calculation (Relative to Max Volume of the day)
                        const barWidth = (row.vol / profile.maxVolume) * widthScale;

                        // Colors
                        if (row.isPoc) ctx.fillStyle = this._options.colorPOC;
                        else if (row.isVA) ctx.fillStyle = this._options.colorVA;
                        else ctx.fillStyle = this._options.colorNormal;

                        // xStart + 1 to leave a tiny gap from the day separator
                        ctx.fillRect(drawX + 1, drawY, barWidth, height);
                    });
                }

                // 3. Draw VA Lines
                if (this._options.showVALines && profile.levels) {
                    const lineLength = widthScale * 2;
                    const startLineX = drawX + 1;
                    const endLineX = drawX + 1 + lineLength;

                    let endX = null;
                    const nextProfile = this._fullData[this._fullData.indexOf(profile) + 1];

                    if (nextProfile) {
                        if (nextProfile.anchorIndex !== undefined) 
                            endX = timeScale.logicalToCoordinate(nextProfile.anchorIndex);
                        else 
                            endX = timeScale.timeToCoordinate(nextProfile.time);    
                    }

                    // Logic: If next profile coordinate is valid, stop 40px before it.
                    // If not valid (future), extend to current right edge
                    if (endX !== null) {
                        endX = endX - 40; // Padding
                    } else {
                        // Current day: Extend to right edge of chart or last bar
                        endX = startLineX + 300; // fallback width if today
                    }

                    const drawLevel = (price, color, lineWidth = 1, isDotted = false) => {
                        const y = this._series.priceToCoordinate(price);
                        if (y === null) return;

                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = lineWidth;

                        if (isDotted) 
                            ctx.setLineDash([3, 3]); // 3px dash, 3px gap
                        else 
                            ctx.setLineDash([]); // Solid
                        

                        ctx.moveTo(startLineX, y);
                        ctx.lineTo(endX, y);
                        ctx.stroke();
                    };

                    drawLevel(profile.levels.val, this._options.colorVA, 1, true);
                    drawLevel(profile.levels.vah + rowSize, this._options.colorVA, 1, true);
                    drawLevel(profile.levels.poc + (rowSize/2), this._options.colorPOC, 2, true);
                }

                // Stats Text
                if (this._options.showCounts) {
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#B2B5BE';

                    if (profile.rows) {
                        profile.rows.forEach(row => {
                            const yTop = this._series.priceToCoordinate(row.price + rowSize);
                            const yBottom = this._series.priceToCoordinate(row.price);

                            if (yBottom === null || yTop === null) return;

                            if (Math.abs(yBottom - yTop) < 6) ctx.font = '4px sans-serif';

                            // Only draw text if rows are tall enough
                            if (Math.abs(yBottom - yTop) < 2) return;

                            const yMid = (yTop + yBottom) / 2;

                            const volText = Math.round(row.vol).toString();

                            ctx.fillText(volText, drawX - 4, yMid);
                        });
                    }

                    if (profile.stats) {
                        const yBottomProfile = this._series.priceToCoordinate(profile.stats.minPrice);
                        
                        if (yBottomProfile !== null) {
                            ctx.textAlign = 'left';
                            ctx.fillStyle = '#DCEDE3'; // Brighter text
                            
                            const xStat = drawX; 
                            const yStatStart = yBottomProfile + 15;

                            ctx.font = '12px sans-serif';
                            //ctx.fillText(`Above: ${profile.stats.above}`, xStat, yStatStart);
                            //ctx.fillText(`Below: ${profile.stats.below}`, xStat, yStatStart + 12);
                            const totalText = formatVol(profile.totalVolume);
                            ctx.fillText(`Total: ${totalText}`, xStat, yStatStart);
                        }
                    }
                }

                // NAKED POC
                if (this._options.showNakedPOC) {
                    const pocPrice = profile.levels.poc;
                    let touchX = null;
                    let isNaked = true;

                    // look ahad loop
                    for (let j = i + 1; j < this._fullData.length; j++) {
                        const futureProfile = this._fullData[j];
                        if (!futureProfile.stats) continue;
                        if (pocPrice >= futureProfile.stats.minPrice && pocPrice <= futureProfile.stats.maxPrice + rowSize) {
                            isNaked = false;

                            if (futureProfile.anchorIndex !== undefined) 
                                touchX = timeScale.logicalToCoordinate(futureProfile.anchorIndex);
                            else 
                                touchX = timeScale.timeToCoordinate(futureProfile.time);
                            
                            break;
                        }
                    }   
                    const lineStartX = drawX;
                    let lineEndX;
                    if (isNaked) {
                        // Never touched: Extend to infinity (current right edge of screen)
                        lineEndX = scope.mediaSize.width;
                    }
                    else {
                        lineEndX = touchX;
                    }

                    if (lineEndX !== null && lineEndX > lineStartX) {
                        const y = this._series.priceToCoordinate(pocPrice + (rowSize / 2));
                        if(y !== null) {
                            ctx.beginPath();
                            ctx.setLineDash([4, 4]); 
                            ctx.strokeStyle = this._options.colorPOC || "#db8d1f";
                            ctx.lineWidth = 2;
                            ctx.moveTo(lineStartX, y);
                            ctx.lineTo(lineEndX, y);
                            ctx.stroke();
                            ctx.setLineDash([]); // Reset dash for next drawing
                        }
                    }
                }
            });
            ctx.restore();
        });
    }
    updateData(data) { this._fullData = data; }
    updateOptions(options) { this._options = options; }
    setSeriesApi(seriesApi) { this._series = seriesApi; }
}

export class VPSeries {
    constructor(chart) {
        this._renderer = new VPRenderer(chart);
        this._options = { 
            colorNormal: '#5c5c5c', 
            colorVA: '#bababa', 
            colorPOC: '#e91c30', 
            rowSize: 10,
            width: 100, // Pixels wide
            xOffset: 0,
            showVALines: false,
            showNakedPOC: false,
            lastValueVisible: false,
            priceLineVisible: false
        };
        this._renderer.updateOptions(this._options);
    }

    renderer() { return this._renderer; }

    priceValueBuilder(plotRow) {
        // plotRow corresponds to one item in your data array (one day profile)
        if (!plotRow.rows || plotRow.rows.length === 0) return null;

        let min = Infinity;
        let max = -Infinity;

        // Iterate through all rows in this profile to find the High and Low price
        for (let i = 0; i < plotRow.rows.length; i++) {
            const p = plotRow.rows[i].price;
            if (p < min) min = p;
            if (p > max) max = p;
        }

        // Return [Low, High, Close]
        // This tells the chart how to scale the Y-axis
        return [min, max, max];
    }

    isWhitespace(data) { return !data.rows; }

    defaultOptions() { return this._options; }

    setFullData(data) { this._renderer.updateData(data); }

    setSeries(seriesApi) { this._renderer.setSeriesApi(seriesApi); }

    update(data, options) {
        if (options) {
            this._options = { ...this._options, ...options };
            this._renderer.updateOptions(this._options);
        }
    }

    applyOptions(options) { this.update(null, options); }
}