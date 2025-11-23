import React, { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, CrosshairMode, HistogramSeries, LineSeries } from "lightweight-charts";
import { useChartIndicators, updateLiveIndicators, setIndicatorsData } from "./useChartIndicators";
import Spinner from "./Spinner";
import EMAsettings from "./modals/EMAsettings";
import VolumeSettings from "./modals/VolumeSettings";
import { X } from "lucide-react";
import { Settings } from "lucide-react";

const Chart = ({selectedAsset, timeframe, panelOpen, indicators = [], onIndicatorsChange}) => {

    const chartContainer = useRef();
    const chartRef = useRef();

    const priceSeriesRef = useRef(null);
    const seriesMapRef = useRef({}); // store active indicators(drawing props)
    const indicatorsRef = useRef(indicators); // track live indicators(volume, histograms need to know which color is up/down every time)

    const wsRef = useRef(null);
    const candlesRef = useRef([]); // local copy of history + live candles

    const [EMAsettingsOpen, setEMAsettingsOpen] = useState(false);
    const [volumeSettingsOpen, setVolumeSettingsOpen] = useState(false);
    const [editingIndicator, setEditingIndicator] = useState(null);

    const [loading, setLoading] = useState(false);


    useEffect(() => { //sync ref with state
        indicatorsRef.current = indicators;
    }, [indicators]);

    useChartIndicators(chartRef, seriesMapRef, indicators, candlesRef);

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

        updateLiveIndicators(
            seriesMapRef.current, 
            indicatorsRef.current, 
            candlesRef.current
        );
    };

    // load history + open websocket when symbol/timeframe change //////////////////////////////
    useEffect(() => {
        if (!selectedAsset || !timeframe || !chartRef.current) return;

        let isMounted = true;
        Promise.resolve().then(() => {
            if (isMounted) setLoading(true);
        });

        const chart = chartRef.current;

        // Clear price & indicator data (safe even if seriesMap is empty)
        try { priceSeriesRef.current.setData([]); } catch (e) {console.log(e)}
        Object.values(seriesMapRef.current).forEach(s => {
            try { s.setData([]); } catch (e) {console.log(e)}
        });

        fetch(`http://localhost:3001/history/${selectedAsset}/${timeframe}`)
        .then(r => r.json())
        .then(history => {
            if (!isMounted) return;
            candlesRef.current = history;
            priceSeriesRef.current.setData(history);
            
            setIndicatorsData(seriesMapRef.current, indicatorsRef.current, history);

            chart.timeScale().fitContent();
        })
        .catch(err => {
            console.error("History fetch error:", err);
        })
        .finally(() => {
            if (isMounted) setLoading(false);
        });

        // Reset websocket
        wsRef.current = new WebSocket(`ws://localhost:3001?symbol=${selectedAsset}&timeframe=${timeframe}`);
        wsRef.current.onmessage = (evt) => handleRealtime(JSON.parse(evt.data));
        wsRef.current.onerror = (e) => console.warn("WS error", e);
        
        return () => {
            isMounted = false;
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (e) {console.log(e)}
                wsRef.current = null;
            }
        };

    }, [selectedAsset, timeframe]);

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

    /// Indicators ////////////////////////////////////////////////////////////////////////
    const openEMAsettings = (indicator) => {
        setEditingIndicator(indicator);
        setEMAsettingsOpen(true);
    };

    const openVolumeSettings = () => setVolumeSettingsOpen(true);

    const saveVolumeSettings = ({ upColor, downColor }) => {
        onIndicatorsChange(prev => prev.map(ind =>
            ind.id === "volume" ? { ...ind, upColor, downColor } : ind
        ));
    };

    const saveEMAsettings = (updatedIndicator) => {
        onIndicatorsChange(prev => prev.map(i =>
            i === editingIndicator ? { ...i, ...updatedIndicator } : i
        ));
        setEMAsettingsOpen(false);
        setEditingIndicator(null);
    };

    const onRemoveIndicator = (indicatorToRemove) => {
        onIndicatorsChange(prev => prev.filter(i => i !== indicatorToRemove));
    };

    return (
        <div className="relative w-full h-full">

            <div ref={chartContainer} className="chart-container w-full h-full">

            {loading && <Spinner/>}

            {indicators.length > 0 && (
                <div className="absolute top-2 left-0 text-white text-sm px-4 py-1 z-40">
                    <span className="flex items-center px-4 py-1 bg-black/30 shadow-md mb-1">Indicators : </span>
                    {indicators.map((ind, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-1 bg-black/30 shadow-md mb-1">
                            <div className="flex gap-2 items-center">
                                <span>{ind.id.toUpperCase()}{ind.length ? ind.length : ""}</span>
                                {ind.color && (
                                    <div className="w-3 h-3 rounded-sm border border-(--gray)"
                                    style={{backgroundColor: ind.color}}/>
                                )}
                                </div>
                            <div className="flex gap-2 items-center ml-8">
                                {ind.id == "volume" && (
                                    <button onClick={() => openVolumeSettings(ind)} className="text-white hover:text-(--red) cursor-pointer">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "ema" && (
                                    <button onClick={() => openEMAsettings(ind)} className="text-white hover:text-(--red) cursor-pointer">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                <button onClick={() => onRemoveIndicator(ind)} className="text-white hover:text-(--red) cursor-pointer">
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            </div>

            {EMAsettingsOpen && editingIndicator && editingIndicator.id === "ema" && (
                <EMAsettings
                open={EMAsettingsOpen}
                onClose={() => { setEMAsettingsOpen(false); setEditingIndicator(null); }}
                initial={editingIndicator}
                onSave={saveEMAsettings}
                />
            )}

            {volumeSettingsOpen && (
                <VolumeSettings
                open={volumeSettingsOpen}
                onClose={() => setVolumeSettingsOpen(false)}
                initial={indicators.find(i => i.id === "volume") || {}}
                onSave={saveVolumeSettings}
                />
            )}

        </div>
    );
};

export default Chart;