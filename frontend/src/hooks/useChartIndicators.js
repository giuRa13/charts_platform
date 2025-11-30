import { useEffect } from "react";
import { HistogramSeries, LineSeries } from "lightweight-charts";
import { prepareVolumeData, updateLastVolume } from "../indicators/volume";
import { prepareEMA, updateLastEMA } from "../indicators/ema";
import { prepareTPOData } from "../indicators/tpo";
import { TPOSeries } from "../indicators/tpoSeries";

export const useChartIndicators = (
    chartRef, 
    seriesMapRef, 
    indicators, 
    candlesRef
) => {

    // 1. Logic to Sync Indicators (Add/Remove/Update Settings)
    useEffect(() => {
        if (!chartRef.current) return;
        const chart = chartRef.current;

        // --- VOLUME MANAGE ---
        const volumeIndicator = indicators.find(ind => ind.id === "volume");
        if (volumeIndicator) {
            if (!seriesMapRef.current.volume) {
                // Init Volume
                const series = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" } }, 1);
                seriesMapRef.current.volume = series;
                
                // Layout adjustments
                const panes = chart.panes();
                if(panes[0]) panes[0].setStretchFactor(0.8);
                if(panes[1]) panes[1].setStretchFactor(0.2);
                
                series.priceScale("right").applyOptions({ scaleMargins: { top: 0, bottom: 0 } });
            }
            
            // Update Data/Colors
            seriesMapRef.current.volume.setData(
                prepareVolumeData(
                    candlesRef.current,
                    volumeIndicator.upColor || "#2c99c0", 
                    volumeIndicator.downColor || "#be292d" 
                )
            );
        } else {
            // Remove Volume
            if (seriesMapRef.current.volume) {
                chart.removeSeries(seriesMapRef.current.volume);
                delete seriesMapRef.current.volume;
                const panes = chart.panes();
                if (panes[0]) panes[0].setStretchFactor(1);
            }
        }

        // --- EMA MANAGE ---
        const emaIndicators = indicators.filter(ind => ind.id === "ema");
        const wantedLengths = new Set(emaIndicators.map(i => i.length));
        
        emaIndicators.forEach(ind => {
            const key = `ema${ind.length}`;
            if (!seriesMapRef.current[key]) {
                const line = chart.addSeries(LineSeries, { 
                    color: ind.color, 
                    lineWidth: ind.lineWidth || 2,
                    priceLineVisible: false,
                });
                seriesMapRef.current[key] = line;
                line.setData(prepareEMA(candlesRef.current, ind.length));
            } else {
                seriesMapRef.current[key].applyOptions({ 
                    color: ind.color,
                    lineWidth: ind.lineWidth || 2,
                }); 
            }
        });

        // Clean up removed EMAs
        Object.keys(seriesMapRef.current).forEach(key => {
            if (key.startsWith("ema")) {
                const len = Number(key.replace("ema", ""));
                if (!wantedLengths.has(len)) {
                    chart.removeSeries(seriesMapRef.current[key]);
                    delete seriesMapRef.current[key];
                }
            }
        });

        // --- TPOs MANAGE ---
        const tpoIndicator = indicators.find(ind => ind.id === "tpo");

         if (tpoIndicator) {
           if (!seriesMapRef.current.tpo) {
                const seriesInstance = new TPOSeries(chart);
                
                const series = chart.addCustomSeries(seriesInstance, {
                    priceScaleId: 'right', 
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                // Pass the API object to the custom instance
                seriesInstance.setSeries(series);
                
                series._customInstance = seriesInstance;
                seriesMapRef.current.tpo = series;
            }

            const blockSize = Number(tpoIndicator.blockSize) || 50;
            const blockWidth = Number(tpoIndicator.blockWidth) || 8;
            const tpoData = prepareTPOData(candlesRef.current, blockSize);

            // 4. Update Options
            seriesMapRef.current.tpo.applyOptions({
                colorNormal: tpoIndicator.colorNormal || "#00378f",
                colorVA: tpoIndicator.colorVA || "#bababa" ,
                colorPOC: tpoIndicator.colorPOC || "#db8d1f",
                blockSize: blockSize,
                blockWidth: blockWidth,
                colorText: tpoIndicator.colorText || "#B2B5BE",
                showCounts: tpoIndicator.showCounts !== false,
                showLines: tpoIndicator.showLines !== false,
                expand: tpoIndicator.expand === true
            });

            // 5. Standard API Data Set (Required for AutoScale)
            // (This just helps the chart calculate High/Low for auto-scaling)
            seriesMapRef.current.tpo.setData(tpoData);
            
            // PASS PREPARED TPO DATA TO RENDER
            // must call this on the _customInstance, NOT the series API
            if (seriesMapRef.current.tpo._customInstance) {
                seriesMapRef.current.tpo._customInstance.setFullData(tpoData);
            }
        }
        else {
            if (seriesMapRef.current.tpo) {
                chart.removeSeries(seriesMapRef.current.tpo);
                delete seriesMapRef.current.tpo;
            }
        }

    }, [indicators]); // Re-run when indicators change
};

// 2. Logic to Update Live Ticks
export const updateLiveIndicators = (seriesMap, indicators, candles) => {
    
    // Volume
    if (seriesMap.volume) {
        const volConfig = indicators.find(i => i.id === "volume");
        updateLastVolume(
            seriesMap.volume,
            candles,
            volConfig?.upColor || "#2c99c0",
            volConfig?.downColor || "#be292d" 
        );
    }

    // EMAs
    Object.keys(seriesMap).forEach(key => {
        if (key.startsWith("ema")) {
            const len = Number(key.replace("ema", ""));
            updateLastEMA(seriesMap[key], candles, len);
        }
    });

    if (seriesMap.tpo && candles.length > 1) {
        const lastCandle = candles[candles.length -1];
        const prevCandle = candles[candles.length -2];

        // (update evry 30min)
        // Calculate 30-minute slot index for current and previous candle (1800 seconds = 30 min)
        // const currentSlot = Math.floor(lastCandle.time / 1800); // buckets time into 30-minute integers. 10:00 
        // const prevSlot = Math.floor(prevCandle.time / 1800); // Index 20 10:29 → Index 20 10:30 Index 21 (Change detected!) 
        // const isNewQuad = currentSlot > prevSlot;
        //if (isNewQuad) {`

        // (update every 1 minute)
        if (lastCandle.time !== prevCandle.time){
        //if (isNewQuad) {
            const tpoConfig = indicators.find(i => i.id === "tpo");
            const blockSize = Number(tpoConfig?.blockSize) || 50;

            const tpoData = prepareTPOData(candles, blockSize);
            // pdate Series (API Wrapper)
            seriesMap.tpo.setData(tpoData);
            // update custom renderer
            if (seriesMap.tpo._customInstance) {
                seriesMap.tpo._customInstance.setFullData(tpoData);
            }
        }
    }
};

// 3. Logic to Set Initial Data (After Fetch) <--- NEW FUNCTION
export const setIndicatorsData = (seriesMap, indicators, history) => {
    // Volume
    if (seriesMap.volume) {
        const volumeIndicator = indicators.find(ind => ind.id === "volume");
        seriesMap.volume.setData(
            prepareVolumeData(
                history,
                volumeIndicator?.upColor || "#2c99c0",
                volumeIndicator?.downColor || "#be292d" 
            )
        );
    }
    
    // EMA
    Object.keys(seriesMap)
        .filter(k => k.startsWith("ema"))
        .forEach(k => {
            const len = Number(k.replace("ema", ""));
            seriesMap[k].setData(prepareEMA(history, len));
    });

    // TPO History Load
    if (seriesMap.tpo) {
        const tpoConfig = indicators.find(i => i.id === "tpo");
        const blockSize = Number(tpoConfig?.blockSize) || 10;
        const tpoData = prepareTPOData(history, blockSize);
        
        seriesMap.tpo.setData(tpoData);
        
        if (seriesMap.tpo._customInstance) {
            // Ensure series is linked (just in case)
            seriesMap.tpo._customInstance.setSeries(seriesMap.tpo);
            seriesMap.tpo._customInstance.setFullData(tpoData);
        }
    }
};