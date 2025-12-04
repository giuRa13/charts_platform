import { useEffect } from "react";
import { HistogramSeries, LineSeries } from "lightweight-charts";
import { prepareVolumeData, updateLastVolume } from "../indicators/volume";
import { prepareEMA, updateLastEMA } from "../indicators/ema";
import { prepareTPOData } from "../indicators/tpo";
import { TPOSeries } from "../indicators/tpoSeries";
import { prepareVPData } from "../indicators/sessionVolumeProfile";
import { VPSeries } from "../indicators/svpSeries";
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

            seriesMapRef.current.volume.applyOptions({
                visible: volumeIndicator.visible !== false // Default true
            });
            
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
                    visible: ind.visible !== false,
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
        if (tpoIndicator && seriesMapRef.current.tpo) {
            seriesMapRef.current.tpo.applyOptions({
                visible: tpoIndicator.visible !== false
            });
        }

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
            const blockWidth = Number(tpoIndicator.blockWidth) || 6;
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
                expand: tpoIndicator.expand === true,
                showNakedPOC: tpoIndicator.showNakedPOC === true
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

        // --- VP MANAGE ---
        const vpIndicator = indicators.find(ind => ind.id === "svp");
        if (vpIndicator && seriesMapRef.current.vp) {
            seriesMapRef.current.vp.applyOptions({
                visible: vpIndicator.visible !== false
            });
        }
        if (vpIndicator) {
            if (!seriesMapRef.current.vp) {
                const seriesInstance = new VPSeries(chart);
                const series = chart.addCustomSeries(seriesInstance, {
                    priceScaleId: 'right', 
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                seriesInstance.setSeries(series);
                series._customInstance = seriesInstance;
                seriesMapRef.current.vp = series;
            }

            const rowSize = Number(vpIndicator.rowSize) || 10;
            const vpData = prepareVPData(candlesRef.current, rowSize);

            seriesMapRef.current.vp.applyOptions({
                colorVA: vpIndicator.colorVA || '#bababa',
                colorNormal: vpIndicator.colorNormal || '#5c5c5c',
                colorPOC: vpIndicator.colorPOC || '#e91c30',
                width: vpIndicator.width || 100,
                rowSize: rowSize,
                xOffset: Number(vpIndicator.xOffset) || 0,
                showVALines: vpIndicator.showVALines === true,
                showNakedPOC: vpIndicator.showNakedPOC === true,
                showCounts: vpIndicator.showCounts !== false
            });

            seriesMapRef.current.vp.setData(vpData); // For API
            if (seriesMapRef.current.vp._customInstance) {
                seriesMapRef.current.vp._customInstance.setFullData(vpData); // For Renderer
            }
        } else {
            if (seriesMapRef.current.vp) {
                chart.removeSeries(seriesMapRef.current.vp);
                delete seriesMapRef.current.vp;
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

    // TPO and SVP
    // Check for New Candle (1 Minute boundary)
    // This prevents heavy calculations on every tick
    if (candles.length < 2) return;
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const isNewCandle = lastCandle.time !== prevCandle.time;
    if (!isNewCandle) return;

    if (seriesMap.tpo) {

        const tpoConfig = indicators.find(i => i.id === "tpo");
        const blockSize = Number(tpoConfig?.blockSize) || 50;

        const tpoData = prepareTPOData(candles, blockSize);
        // pdate Series (API Wrapper)
        seriesMap.tpo.setData(tpoData);
        // update custom renderer
        if (seriesMap.tpo._customInstance) 
            seriesMap.tpo._customInstance.setFullData(tpoData); 
        
    }

    // SVP
    // check if a new 1-minute candle has formed, and if so, recalculate the Volume Profile. 
    // This prevents the chart from freezing due to calculating heavy math on every single millisecond tick
    if (seriesMap.vp) {
        const vpConfig = indicators.find(i => i.id === "svp");
        const rowSize = Number(vpConfig?.rowSize) || 10;

        const vpData = prepareVPData(candles, rowSize);

        seriesMap.vp.setData(vpData);

        if (seriesMap.vp._customInstance)
            seriesMap.vp._customInstance.setFullData(vpData);
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

    // SVP 
    if (seriesMap.vp) {
        const vpConfig = indicators.find(i => i.id === "svp");
        const rowSize = Number(vpConfig?.rowSize) || 10;

        // Recalculate with new history
        const vpData = prepareVPData(history, rowSize);

        // Update Series API
        seriesMap.vp.setData(vpData);

        // Update Custom Renderer
        if (seriesMap.vp._customInstance) {
            seriesMap.vp._customInstance.setFullData(vpData);
        }
    }
};