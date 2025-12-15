class FootprintRenderer {
    constructor(chart) {
        this._chart = chart;
        this._data = [];
        this._options = null;
        this._series = null;
    };

    draw(target) {
        if (!this._data || this._data.length === 0 || !this._options || !this._series || !this._chart) return;

        target.useMediaCoordinateSpace(scope => {
            const ctx = scope.context;
            const rowSize = Number(this._options.rowSize) || 0.5;
            // Removed maxBarsToDraw - we rely on visual zoom instead
            const alphaContrast = this._options.alphaContrast || 15;
            const showImbalance = this._options.showImbalance !== false;
            const imbalanceRatio = Number(this._options.imbalanceRatio) || 3.0;
            const imbalanceMinValue = Number(this._options.imbalanceMinValue) || 5;

            ctx.save();
            //ctx.font = '11px sans-serif';
            ctx.textBaseline = 'middle';

            // 1. CLIP CANVAS (Prevents stacking on edges)
            ctx.beginPath();
            ctx.rect(0, 0, scope.mediaSize.width, scope.mediaSize.height);
            ctx.clip();

            // 2. CALCULATE SPACING 
            // ask the chart: "How many pixels wide is one step on the X axis?"
            // This is constant regardless of where you scroll
            // logicalToCoordinate returns the pixel position for a logical index (0, 1, 2...).
            /*const timeScale = this._chart.timeScale();
            const x0 = timeScale.logicalToCoordinate(0);
            const x1 = timeScale.logicalToCoordinate(1);
            let barSpacing = x1 - x0; 
            if (barSpacing < 1) barSpacing = 1;*/
            let barSpacing = 30;
            if (this._chart) {
                const ts = this._chart.timeScale();
                const x0 = ts.logicalToCoordinate(0);
                const x1 = ts.logicalToCoordinate(1);
                // Math.abs fixes potential negative indexing issues
                barSpacing = Math.abs(x1 - x0);
            }
            // Safety: If chart isn't ready, logical coords return null.
            if (!barSpacing || isNaN(barSpacing)) barSpacing = 30;

            // 3. RESPONSIVE LAYOUT
            const candleWidth = Math.max(2, barSpacing * 0.9);
            const halfWidth = candleWidth / 2;

            const THRESHOLD_TEXT_VISIBLE = 35; 
            const showText = barSpacing > THRESHOLD_TEXT_VISIBLE;
            const THRESHOLD_GRID_VISIBLE = 15;
            const isZoomedIn = barSpacing > THRESHOLD_GRID_VISIBLE;

            this._data.forEach((bar) => {
                const x = bar.x;
                // Culling: Only skip if WAY off screen (safety margin)
                //if (x < -candleWidth || x > scope.mediaSize.width + candleWidth) return;
                if (x < -candleWidth * 2 || x > scope.mediaSize.width + candleWidth * 2) return;

                const candleData = bar.originalData;
                if (!candleData.rows) return;

                const openY = this._series.priceToCoordinate(candleData.open);
                const closeY = this._series.priceToCoordinate(candleData.close);
                const highY = this._series.priceToCoordinate(candleData.high);
                const lowY = this._series.priceToCoordinate(candleData.low);

                const bodyTop = Math.min(openY, closeY);
                const bodyBottom = Math.max(openY, closeY);

                const isUp = candleData.close >= candleData.open;
                const color = isUp ? "#2c99c0" : "#be292d";
                const colorA = isUp ? "#74A6E2" : "#AA3A37";
                
                // --- MODE A: SIMPLE CANDLE ---
                if (!isZoomedIn) {
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = colorA;
                    ctx.fillStyle = colorA;
                    ctx.moveTo(x, highY); ctx.lineTo(x, lowY); ctx.stroke(); // Wick
                    const simpleWidth = Math.min(candleWidth, 10); // Body
                    ctx.fillRect(x - (simpleWidth/2), bodyTop, simpleWidth, Math.max(1, bodyBottom - bodyTop));
                    return; 
                }

                // --- MODE B: DETAILED FOOTPRINT (Zoomed In) ---
                // 1. Pre-calc Max Vol
                let maxRowVol = 0;
                let pocPriceStr = null;
                Object.entries(candleData.rows).forEach(([priceKey, r]) => {
                    if (r.vol > maxRowVol) { maxRowVol = r.vol; pocPriceStr = priceKey; }
                });
                const opacityBase = Math.max(maxRowVol, alphaContrast);

                // 2. Draw Wick (Split)
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = color; 
                ctx.moveTo(x, highY); ctx.lineTo(x, bodyTop);
                ctx.moveTo(x, bodyBottom); ctx.lineTo(x, lowY);
                ctx.stroke();

                const leftX = x - halfWidth;

                // 3. Draw Rows
                Object.entries(candleData.rows).forEach(([priceStr, vol]) => {
                    const price = Number(priceStr);
                    const yTop = this._series.priceToCoordinate(price + rowSize);
                    const yBottom = this._series.priceToCoordinate(price);
                    
                    if (yTop === null || yBottom === null) return;
                    let height = Math.abs(yBottom - yTop);
                    if (height < 1) height = 1; 
                    const drawY = Math.min(yTop, yBottom);

                    // Heatmap
                    const delta = vol.buy - vol.sell;
                    const isBullRow = delta >= 0;
                    const rawOpacity = vol.vol / opacityBase;
                    const opacity = Math.max(0.05, Math.min(0.9, rawOpacity));
                    const rgb = isBullRow ? "34, 84, 144" : "147, 35, 32"; 

                    ctx.fillStyle = `rgba(${rgb}, ${opacity})`;
                    ctx.fillRect(leftX, drawY, candleWidth, height + 0.5);

                    // POC Border
                    if (this._options.showPOC && priceStr === pocPriceStr) {
                        ctx.strokeStyle = this._options.colorPOC || "#FFFF00";
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(leftX, drawY, candleWidth, height);
                    }

                    // Text (Only if wide enough)
                    if (showText && height > 10) {
                        const yMid = drawY + (height / 2);

                        const dynamicFontSize = Math.min(14, Math.floor(height * 0.70));
                        
                        // "x"
                        ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; 
                        ctx.textAlign = "center";
                        ctx.font = `${Math.max(9, dynamicFontSize - 2)}px sans-serif`;
                        ctx.fillText("x", x, yMid);

                        // Imbalance 
                        let isAskImb = false; 
                        let isBidImb = false;
                        if (showImbalance) {
                             const lowerPrice = Math.round((price - rowSize) * 10000000) / 10000000;
                             const lowerRow = candleData.rows[lowerPrice];
                             const lowerSell = lowerRow ? lowerRow.sell : 0;
                             if (vol.buy >= imbalanceMinValue) {
                                 if (lowerSell === 0 || vol.buy / lowerSell >= imbalanceRatio) isAskImb = true;
                             }
                             const upperPrice = Math.round((price + rowSize) * 10000000) / 10000000;
                             const upperRow = candleData.rows[upperPrice];
                             const upperBuy = upperRow ? upperRow.buy : 0;
                             if (vol.sell >= imbalanceMinValue) {
                                 if (upperBuy === 0 || vol.sell / upperBuy >= imbalanceRatio) isBidImb = true;
                             }
                        }

                        const baseFont = `${dynamicFontSize}px sans-serif`;
                        const boldFont = `bold ${dynamicFontSize}px sans-serif`;

                        // Sell Left
                        ctx.textAlign = "right";
                        ctx.font = isBidImb ? boldFont : baseFont;
                        ctx.fillStyle = isBidImb ? (this._options.imbBidColor || "#FF0000") : (this._options.colorText || '#FFFFFF');
                        ctx.fillText(Math.round(vol.sell), x - 10, yMid);

                        // Buy Right
                        ctx.textAlign = "left";
                        ctx.font = isAskImb ? boldFont : baseFont;
                        ctx.fillStyle = isAskImb ? (this._options.imbAskColor || "#0000FF") : (this._options.colorText || '#FFFFFF');
                        ctx.fillText(Math.round(vol.buy), x + 10, yMid);
                    }
                });

                // 4. Candle Body Border (On Top)
                if (candleWidth > 4) {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = color;
                    ctx.strokeRect(leftX, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
                }
            });

            ctx.restore();
        });
    }

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
    constructor(chart) {
        this._renderer = new FootprintRenderer(chart);
        this._options = { 
            rowSize: 10, 
            colorText: '#FFFFFF',
            maxBars: 20, 
            showPOC: true, 
            colorPOC: '#FFFF00',
            alphaContrast: 15,
            showImbalance: true, 
            imbalanceRatio: 3.0,
            imbalanceMinValue: 5, 
            imbBidColor: "#FF0000",
            imbAskColor: "#0011ff",
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