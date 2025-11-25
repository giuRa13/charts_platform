import React, { useEffect, useRef, useState } from "react";
import { CandlestickSeries, createChart, CrosshairMode, HistogramSeries, LineSeries } from "lightweight-charts";
import { useChartIndicators, updateLiveIndicators, setIndicatorsData } from "../hooks/useChartIndicators";
import { useChartSettings } from "../hooks/useChartSettings";
import { useDrawings } from "../hooks/useDrawings";
import EMAsettings from "./modals/EMAsettings";
import VolumeSettings from "./modals/VolumeSettings";
import DrawingsSettings from "./modals/DrawingsSettings";
import Spinner from "./Spinner";
import Clock from "./Clock";
import { Settings } from "lucide-react";
import { Pencil, Square, MousePointer2, Trash2, ArrowRight, X } from "lucide-react";


const Chart = ({
    selectedAsset, 
    timeframe, 
    panelOpen, 
    indicators = [], 
    onIndicatorsChange, 
    chartSettings,
}) => {

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

    // Drawings ////////////////////////////////////////////////////////////////////////////////
    const [drawingSettingsOpen, setDrawingSettingsOpen] = useState(false);
    const [editingObjectIndex, setEditingObjectIndex] = useState(null);
    const [editingObjectData, setEditingObjectData] = useState(null);

    // Callback when user double clicks a shape
    const handleOpenObjectSettings = (index, objectData) => {
        setEditingObjectIndex(index);
        setEditingObjectData(objectData);
        setDrawingSettingsOpen(true);
    };

    const { 
        canvasRef, 
        setDrawings,
        currentTool, 
        setCurrentTool,
        renderDrawings,
        updateDrawing,
        removeDrawing,
    } = useDrawings(chartRef, priceSeriesRef, chartContainer, handleOpenObjectSettings);

    const handleSaveObjectSettings = (newSettings) => {
        if (editingObjectIndex !== null) {
            updateDrawing(editingObjectIndex, newSettings);
        }
    };

    const handleDeleteObject = () => {
        if (editingObjectIndex !== null) {
            removeDrawing(editingObjectIndex);
            setDrawingSettingsOpen(false);
        }
    };
    /////////////////////////////////////////////////////////////////////////////////////////////

    useEffect(() => { //sync ref with state
        indicatorsRef.current = indicators;
    }, [indicators]);

    useChartIndicators(chartRef, seriesMapRef, indicators, candlesRef);

    useChartSettings(chartRef, priceSeriesRef, chartSettings);

    // create chart once //////////////////////////////////////////////////////////
    useEffect(() => {
        const container = chartContainer.current;
        if (!container) return;

        const chart = createChart(container, {
            layout: { 
                textColor: chartSettings.textColor,
                background: { type: "solid", color: chartSettings.backgroundColor },
                panes: {
                    separatorColor: "#DCEDE3", // "#d83160",
                    separatorHoverColor: 'rgba(216, 46, 96, 0.1)',
                    enableResize: true,
            }},
            grid: { 
                vertLines: { 
                    color: chartSettings.gridColor,
                    visible: chartSettings.gridVertVisible 
                }, 
                horzLines: {
                    color: chartSettings.gridColor, 
                    visible: chartSettings.gridHorzVisible
                }
            },
            crosshair: { mode: chartSettings.magnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal },
            rightPriceScale: { borderColor: "#7c7c7cff" },
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
            upColor: chartSettings.candleUpColor,
            downColor: chartSettings.candleDownColor,
            borderVisible: false,
            wickUpColor: chartSettings.candleUpColor,
            wickDownColor: chartSettings.candleDownColor,
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


    // HANDLE CANVAS RESIZE  (DRAWINGS) ////////////////////////////////////////////////////////
    // The canvas must match the chart container size exactly
    useEffect(() => {

        const resizeCanvas = () => {
            if (chartContainer.current && canvasRef.current) {
                const { clientWidth, clientHeight } = chartContainer.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                // Force a redraw after resize
                renderDrawings();
            }
        };

        window.addEventListener('resize', resizeCanvas);
        // Initial sizing
        const t = setTimeout(resizeCanvas, 100); 

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            clearTimeout(t);
        };

    }, [panelOpen]);


    return (
        <div className="relative w-full h-full">

            <div ref={chartContainer} className="chart-container w-full h-full">
            {loading && <Spinner/>}
            {chartSettings.showClock && (
                <Clock color={chartSettings.clockColor}/>
            )}
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
                <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 z-20"
                /*style={{ pointerEvents: currentTool ? 'auto' : 'none' }} */
                /*onMouseDown={interactionHandlers.onMouseDown}*/
                />
            </div>

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 flex gap-2 bg-[#1e1e1e] border border-gray-700 p-1 rounded-sm shadow-lg items-center">
                <button onClick={() => setCurrentTool(null)}
                className={`p-2 rounded hover:bg-(--redT) ${!currentTool ? 'text-(--red) bg-gray-800' : 'text-gray-400'}`}>
                    <MousePointer2 size={18} />
                </button>
                <button onClick={() => setCurrentTool('line')}
                className={`p-2 rounded hover:bg-(--redT) ${currentTool === 'line' ? 'text-(--red) bg-gray-800' : 'text-gray-400'}`}>
                    <Pencil size={18} />
                </button>
                <button onClick={() => setCurrentTool('ray')}
                    className={`p-2 rounded hover:bg-(--redT) ${currentTool === 'ray' ? 'text-blue-500 bg-gray-800' : 'text-gray-400'}`}
                    title="Ray">
                    <ArrowRight size={18} />
                </button>
                <button onClick={() => setCurrentTool('rect')}
                className={`p-2 rounded hover:bg-gray-700 ${currentTool === 'rect' ? 'text-blue-500 bg-gray-800' : 'text-gray-400'}`}>
                    <Square size={18} />
                </button>
                 <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button onClick={() => { setDrawings([]); requestAnimationFrame(renderDrawings); }}
                className="p-2 rounded hover:bg-red-900/50 text-red-400">
                    <Trash2 size={18} />
                </button>            
            </div>

            <DrawingsSettings
                open={drawingSettingsOpen}
                onClose={() => setDrawingSettingsOpen(false)}
                currentObject={editingObjectData}
                onSave={handleSaveObjectSettings}
                onDelete={handleDeleteObject}
            />

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
                onDelete={handleDeleteObject}
                />
            )}

        </div>
    );
};

export default Chart;