class FootprintRenderer {
    constructor() {
        this._data = [];
        this._options = null;
        this._series = null;
    };

    draw(target) {
        if (!this._data || this._data.length === 0 || !this._options || !this._series) return;

        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            const rowSize = Number(this._options.rowSize) || 0.5;
            const maxBarsToDraw = Number(this._options.maxBars) || 20; 
            const alphaContrast = this._options.alphaContrast;

            ctx.save();
            ctx.font = '10px sans-serif';
            ctx.textBaseline = 'middle';

            // Calculate where to start drawing Footprints
            // visibleBars contains the bars currently on screen (plus a small buffer)
            const renderStartIndex = Math.max(0, this._data.length - maxBarsToDraw);

            this._data.forEach((bar, index) => {
                const x = bar.x;
                const candleData = bar.originalData; // This holds the prepared rows

                const openY = this._series.priceToCoordinate(candleData.open);
                const closeY = this._series.priceToCoordinate(candleData.close);
                const highY = this._series.priceToCoordinate(candleData.high);
                const lowY = this._series.priceToCoordinate(candleData.low);

                const bodyTop = Math.min(openY, closeY);
                const bodyBottom = Math.max(openY, closeY);
                const bodyHeight = Math.max(1, bodyBottom - bodyTop);

                const isUp = candleData.close >= candleData.open;
                const color = isUp ? "#2c99c0" : "#be292d";

                const isDetailed = index >= renderStartIndex;
                if (!isDetailed) return; 
                
                // --- 1. PRE-CALCULATE MAX VOLUME (For Heatmap) ---
                let maxRowVol = 0;
                let pocPriceStr = null;

                if (candleData.rows && typeof candleData.rows === 'object') {
                    Object.entries(candleData.rows).forEach(([priceKey, r]) => {
                        if (r.vol > maxRowVol) {
                            maxRowVol = r.vol;
                            pocPriceStr = priceKey
                        }
                    });
                }
                else {
                    return; 
                }

                // If the highest row in the candle is only 5, we divide by 100 instead of 5.
                // This keeps low volume candles transparent.
                const opacityBase = Math.max(maxRowVol, alphaContrast);

                // --- 2. DRAW WICK (Background) ---
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = color; 
                ctx.moveTo(x, highY);
                ctx.lineTo(x, bodyTop);
                ctx.moveTo(x, bodyBottom);
                ctx.lineTo(x, lowY);
                ctx.stroke();

                const width = 64; 
                const leftX = x - (width / 2);

                // DRAW NUMBERS
                Object.entries(candleData.rows).forEach(([priceStr, vol]) => {
                    const price = Number(priceStr);
                    const yTop = this._series.priceToCoordinate(price + rowSize);
                    const yBottom = this._series.priceToCoordinate(price);
                    if (yTop === null || yBottom === null) return;

                    let height = Math.abs(yBottom - yTop);
                    if (height < 1) height = 1;
                    const drawY = Math.min(yTop, yBottom);

                    // --- 3. HEATMAP COLORING ---
                    const delta = vol.buy - vol.sell;
                    const isBullRow = delta >= 0;
                    let rawOpacity = vol.vol / opacityBase;
                    const opacity = Math.max(0.05, Math.min(0.85, rawOpacity));
                    const rgb = isBullRow ? "34, 84, 144" : "147, 35, 32"; 
                    ctx.fillStyle = `rgba(${rgb}, ${opacity})`;
                    ctx.fillRect(leftX, drawY, width, height + 0.5);

                    // POC
                    if (this._options.showPOC && priceStr === pocPriceStr) {
                        ctx.strokeStyle = this._options.colorPOC || "#FFFF00";
                        ctx.lineWidth = 1; 
                        ctx.strokeRect(leftX, drawY, width, height);
                    }

                    // --- 4. TEXT (Numbers) ---
                    if (height > 12) {
                        const yMid = drawY + (height / 2);

                        // "x" separator
                        ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; 
                        ctx.textAlign = "center";
                        ctx.font = '9px sans-serif';
                        ctx.fillText("x", x, yMid);

                        // Numbers
                        ctx.font = '11px sans-serif'; 
                        ctx.fillStyle = this._options.colorText

                        // Sell (Bid) Left
                        ctx.textAlign = "right";
                        ctx.fillText(Math.round(vol.sell), x - 10, yMid);
                        // Buy (Ask) Right
                        ctx.textAlign = "left";
                        ctx.fillText(Math.round(vol.buy), x + 10, yMid);
                    }
                });
                // --- 5. CANDLE BODY BORDER (On Top) ---
                // This draws the box for the Open/Close range
                ctx.lineWidth = 1;
                ctx.strokeStyle = color;
                ctx.strokeRect(leftX, bodyTop, width, bodyHeight);
            });
            ctx.restore();
        });
    };

    update(data, options) {
        // If the library sends new data (scroll/zoom/setData), update bars
        if (data) {
            this._data = data.bars;
        }
        // Always update options
        this._options = options;
    }

    setSeriesApi(api) {
        this._series = api;
    }

};

export class FootprintSeries {
    constructor() {
        this._renderer = new FootprintRenderer();
        this._options = { 
            rowSize: 10, 
            colorText: '#FFFFFF',
            maxBars: 20, 
            showPOC: true, 
            colorPOC: '#FFFF00',
            alphaContrast: 10,
        };
    };

    renderer() { return this._renderer; }

    priceValueBuilder(plotRow) {
        // Standard OHLC scaling
        return [plotRow.low, plotRow.high, plotRow.close];
    };

    isWhitespace(data) { return data.open === undefined; }
    
    defaultOptions() { return this._options; }

    // Connect API to Renderer
    setSeries(api) {
        this._renderer.setSeriesApi(api);
    }

    update(data, options) {
        if (options) {
            this._options = { ...this._options, ...options };
        }

        this._renderer.update(data, this._options);
    }

    applyOptions(options) { this.update(null, options); }

    // don't need setFullData because we map 1:1 to candles, 
    // so we rely on the library's internal data array.
};