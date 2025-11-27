import { useEffect } from "react";
import { HistogramSeries, LineSeries } from "lightweight-charts";
import { prepareVolumeData, updateLastVolume } from "../indicators/volume";
import { prepareEMA, updateLastEMA } from "../indicators/ema";


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
                const line = chart.addSeries(LineSeries, { color: ind.color, lineWidth: ind.lineWidth || 2 });
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
};