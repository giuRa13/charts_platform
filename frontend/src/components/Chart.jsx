import React, { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, CrosshairMode, HistogramSeries } from "lightweight-charts";
import { prepareVolumeData, updateLastVolume } from "../indicators/volume";
import { X } from "lucide-react";
import { Settings } from "lucide-react";

const Chart = ({selectedAsset, timeframe, panelOpen, indicators, onIndicatorsChange}) => {

    const chartContainer = useRef();
    const chartRef = useRef();

    const priceSeriesRef = useRef(null);
    const seriesMapRef = useRef({}); // store active indicators

    const wsRef = useRef(null);
    const candlesRef = useRef([]); // local copy of history + live candles

    // create chart once //////////////////////////////////////////////////////////
    useEffect(() => {
        const container = chartContainer.current;
        if (!container) return;

        const chart = createChart(container, {
            //autoSize: true,
            layout: { 
                textColor: "#DCEDE3", 
                background: { type: "solid", color: "#1e1e1e" },
                panes: {
                    separatorColor: "#DCEDE3", // "#d83160",
                    separatorHoverColor: 'rgba(216, 46, 96, 0.1)',
                    enableResize: true,
            }},
            grid: { vertLines: { color: "#535151ff" }, horzLines: { visible: false } },
            rightPriceScale: { borderColor: "#7c7c7cff" },
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: {
                rightOffset: 10,
                barSpacing: 15,
                fixLeftEdge: false,
                lockVisibleTimeRangeOnResize: false,
                rightBarStaysOnScroll: true,
                timeVisible: true,
                secondsVisible: true,
                borderColor: "#7c7c7cff",
            },
        });

        chartRef.current = chart;

        const priceSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: false,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
        }, 0);
        priceSeriesRef.current = priceSeries;

        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            chart.resize(width, height);
        };
        window.addEventListener("resize", resize);
        resize();

        return () => {
            window.removeEventListener("resize", resize);
            try { if (wsRef.current) wsRef.current.close(); } catch (e) {console.log(e)}
            try { chart.remove(); } catch (e) {console.log(e)}
            };
    }, []);

    // update price and any active indicator(s) //////////////////////////////////////////////
    const handleRealtime = (msg) => {
        if (!msg.k) return;
        const k = msg.k;

        const candle = {
            time: Math.floor(k.t / 1000),
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v,
        };

        let last = candlesRef.current[candlesRef.current.length - 1];
        if (last && last.time === candle.time) {
            candlesRef.current[candlesRef.current.length - 1] = candle;
        } else {
            candlesRef.current.push(candle);
        }

        priceSeriesRef.current.update(candle);

        // update active indicators
        if (seriesMapRef.current.volume)
            updateLastVolume(seriesMapRef.current.volume, candlesRef.current);
    };

    // load history + open websocket when symbol/timeframe change //////////////////////////////
    useEffect(() => {
        if (!selectedAsset || !timeframe || !chartRef.current) return;

        const chart = chartRef.current;
        // Clear price & indicator data (safe even if seriesMap is empty)
        try { priceSeriesRef.current.setData([]); } catch (e) {console.log(e)}
        Object.values(seriesMapRef.current).forEach(s => {
            try { s.setData([]); } catch (e) {console.log(e)}
        });

        let isMounted = true;
        fetch(`http://localhost:3001/history/${selectedAsset}/${timeframe}`)
        .then(r => r.json())
        .then(history => {
            if (!isMounted) return;
            candlesRef.current = history;
            priceSeriesRef.current.setData(history);
            // update any existing indicators with history
            if (seriesMapRef.current.volume) {
                seriesMapRef.current.volume.setData(prepareVolumeData(history));
            }
            chart.timeScale().fitContent();
        })
        .catch(err => {
            console.error("History fetch error:", err);
        });

        // Reset websocket
        wsRef.current = new WebSocket(`ws://localhost:3001?symbol=${selectedAsset}&timeframe=${timeframe}`);
        wsRef.current.onmessage = (evt) => {
            const msg = JSON.parse(evt.data);
            handleRealtime(msg);
        };
        wsRef.current.onerror = (e) => console.warn("WS error", e);
        
        return () => {
            isMounted = false;
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (e) {console.log(e)}
                wsRef.current = null;
            }
        };

    }, [selectedAsset, timeframe]);

    const addVolumePane = () => {
        const chart = chartRef.current;
        if (!chart || seriesMapRef.current.volume) return;

        const series = chart.addSeries(HistogramSeries, {
            priceFormat: { type: "volume" },
            //lastValueVisible: false,
        }, 1);

        seriesMapRef.current.volume = series;

        series.setData(prepareVolumeData(candlesRef.current));

        // Adjust pane heights
        const candlePane = chart.panes()[0];
        const volumePane = chart.panes()[1];
        candlePane.setStretchFactor(0.8);
        volumePane.setStretchFactor(0.2);

        volumePane.priceScale("right").applyOptions({
          autoScale: true,
          ticksVisible: true,
          scaleMargins: { top: 0, bottom: 0 },
        });
    };

    const removeVolumePane = () => {
        const chart = chartRef.current;
        if (!chart || !seriesMapRef.current.volume) return;

        chart.removeSeries(seriesMapRef.current.volume);
        delete seriesMapRef.current.volume;

        const p0 = chart.panes()[0];
        if (p0) p0.setStretchFactor(1);
    };

    // ADD / REMOVE INDICATORS DYNAMICALLY
    const syncIndicators = () => {
        if (!chartRef.current) return;
        // volume
        if (indicators && indicators.includes("volume")) {
            if (!seriesMapRef.current.volume) addVolumePane();
        } else {
            if (seriesMapRef.current.volume) removeVolumePane();
        }
    };

    useEffect(() => {
        syncIndicators();
    }, [indicators]);

    // react to panelOpen (resize after layout shift)
    useEffect(() => {
        // small delay to let layout complete
        const t = setTimeout(() => {
            if (!chartRef.current || !chartContainer.current) return;
            const { width, height } = chartContainer.current.getBoundingClientRect();
            chartRef.current.resize(width, height);
            // also ensure panes recalc
            chartRef.current.timeScale().fitContent(); 
        }, 120);

        return () => clearTimeout(t);
    }, [panelOpen]);

    const onRemoveIndicator = (name) => {
        if (onIndicatorsChange) {
            onIndicatorsChange(indicators.filter(i => i !== name));
        }
    };


    return (
        <div className="relative w-full h-full">

            <div ref={chartContainer} className="chart-container w-full h-full">

            {indicators.length > 0 && (
                <div className="absolute top-2 left-0 text-white text-sm px-4 py-1 z-40">
                    <span className="flex items-center gap-4 px-4 py-1 bg-black/30 shadow-md mb-1">Indicators : </span>
                    {indicators.map((ind, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-1 bg-black/30 shadow-md mb-1">
                            <span>{ind.toUpperCase()}</span>
                            <button onClick={() => onRemoveIndicator(ind)} className="text-white hover:text-(--red) cursor-pointer">
                                <Settings className="w-4 h-4"/>
                            </button>
                            <button onClick={() => onRemoveIndicator(ind)} className="text-white hover:text-(--red) cursor-pointer">
                                <X className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            </div>

        </div>
    );
};

export default Chart;