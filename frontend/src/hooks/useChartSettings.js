import { useEffect } from "react";
import { CrosshairMode } from "lightweight-charts";

export const useChartSettings = (chartRef, priceSeriesRef, settings) => {

    useEffect(() => {
        if (!chartRef.current || !settings) return;
        const chart = chartRef.current;

        // Apply Layout & Grid Settings
        chart.applyOptions({
            layout: {
                background: { type: 'solid', color: settings.backgroundColor },
                textColor: settings.textColor,
            },
            grid: {
                vertLines: { 
                    color: settings.gridColor, 
                    visible: settings.gridVertVisible 
                },
                horzLines: { 
                    color: settings.gridColor, 
                    visible: settings.gridHorzVisible 
                },
            },
            crosshair: {
                mode: settings.magnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal,
            },
        });

        // Apply Candle Settings (if series exists)
        if (priceSeriesRef.current) {
            priceSeriesRef.current.applyOptions({
                upColor: settings.candleUpColor,
                downColor: settings.candleDownColor,
                borderUpColor: settings.candleUpColor,   // usually same as body
                borderDownColor: settings.candleDownColor, // usually same as body
                wickUpColor: settings.candleUpColor,     // usually same as body
                wickDownColor: settings.candleDownColor, // usually same as body
            });
        }

    }, [settings]);
};