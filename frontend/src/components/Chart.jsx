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
import { GripVertical, Settings, TrendingUpDown, Info, StepBack, Slash, MoveHorizontal, Eye, EyeOff } from "lucide-react";
import { Square, MousePointer2, Trash2, ArrowRight, X } from "lucide-react";
import useDraggable from "../hooks/useDraggable";


const Chart = ({
    selectedAsset, 
    timeframe, 
    panelOpen, 
    indicators = [], 
    onIndicatorsChange, 
    chartSettings,
    onOpenTPOSettings,
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
    const [tpoPopover, setTpoPopover] = useState(null);

    const [loading, setLoading] = useState(false);

    const [showCandles, setShowCandles] = useState(true);

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

    const toolbarRef = useRef(null);
    const toolbarHandleRef = useRef(null);
    useDraggable(toolbarHandleRef, toolbarRef);

    const parseSymbol = (symbol) => {
        if (!symbol) return { base: "", quote: "" };
        
        const knownQuotes = ["USDT", "USDC", "BUSD", "TUSD", "USD", "EUR", "BTC", "ETH", "BNB"];
        
        for (const quote of knownQuotes) {
            if (symbol.endsWith(quote)) {
                return {
                    base: symbol.slice(0, -quote.length),
                    quote: quote
                };
            }
        }
        
        // Fallback if unknown quote (e.g. for some unique pairs)
        return { base: symbol, quote: "" };
    };

    const { base, quote } = parseSymbol(selectedAsset);
    const logoUrl = base ? `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png` : "";

    // create chart once //////////////////////////////////////////////////////////
    useEffect(() => {
        const container = chartContainer.current;
        if (!container) return;

        const chart = createChart(container, {
            layout: { 
                textColor: chartSettings.textColor,
                background: { type: "solid", color: chartSettings.backgroundColor },
                panes: {
                    separatorColor: "#C7C3C5", // "#d83160",
                    separatorHoverColor: 'rgba(0, 168, 194, 0.1)',
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

        return () => {
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

            chart.priceScale('right').applyOptions({
                autoScale: true, // Unlock if user dragged it
            });

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

    // handles Window Resize, Panel Resize, and Dragging automatically
    useEffect(() => {
        const container = chartContainer.current;
        
        // Safety check: wait for chart and container to exist
        if (!container || !chartRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0 || !entries[0].contentRect) return;
            
            const { width, height } = entries[0].contentRect;
            
            // 1. Resize Lightweight Chart
            chartRef.current.resize(width, height);
            
            // 2. Resize Drawing Canvas
            if (canvasRef.current) {
                // Set HTML attributes (buffer size) matches CSS size
                canvasRef.current.width = width;
                canvasRef.current.height = height;
                // Redraw drawings immediately to prevent stretching
                requestAnimationFrame(renderDrawings);
            }
        });

        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
        
    }, [renderDrawings]);

    // toggle price candles visibility
    useEffect(() => {
        if (priceSeriesRef.current) {
            priceSeriesRef.current.applyOptions({
                visible: showCandles
            });
        }
    }, [showCandles]);

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


    // --- EFFECT: DETECT HOVER OVER TPO PROFILE ---
    useEffect(() => {
        const container = chartContainer.current;
        if (!container) return;

        const handleDoubleClick = (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const containerW = container.clientWidth;
            const containerH = container.clientHeight;

            if (seriesMapRef.current.tpo && seriesMapRef.current.tpo._customInstance) {
                const hit = seriesMapRef.current.tpo._customInstance.hitTest(x);

                if (hit) {
                    const popoverWidth = 200; 
                    const popoverHeight = 160;
                    // Ensure it doesn't go off the right edge
                    const safeX = Math.min(x + 20, containerW - popoverWidth);
                    // Ensure it doesn't go off the bottom edge
                    const safeY = Math.min(y, containerH - popoverHeight);
                    setTpoPopover({
                        x: safeX,
                        y: safeY,
                        data: hit // the profile data from renderer
                    });
                } else {
                    setTpoPopover(null); // Clicked empty space
                }
            }
        };

        container.addEventListener('dblclick', handleDoubleClick);
        
        return () => {
            container.removeEventListener('dblclick', handleDoubleClick);
        };
    }, []); 

    // --- HANDLER: CLICK SPLIT BUTTON ---
    const handleToggleSplit = () => {
        if (tpoPopover && seriesMapRef.current.tpo._customInstance) {
            const time = tpoPopover.data.time;
            seriesMapRef.current.tpo._customInstance.toggleSplit(time);
            seriesMapRef.current.tpo.applyOptions({ _redraw: Date.now() }); // force redraw
            // Update button state locally
            setTpoPopover(prev => ({
                ...prev,
                data: {...prev.data, isExpanded: !prev.data.isExpanded}
            }));
        }
    };

    const formatDate = (ts) => {
        return new Date(ts * 1000).toLocaleDateString(undefined, { 
            weekday: 'short', month: 'short', day: 'numeric' 
        });
    };


    return (
        <div className="relative w-full h-full">

            <div ref={chartContainer} className="chart-container w-full h-full">
            {loading && <Spinner/>}
            {chartSettings.showClock && (
                <Clock color={chartSettings.clockColor}/>
            )}
            {/* --- TPO FLOAT BUTTON --- */}
            {tpoPopover && (
                <div className="absolute z-50 bg-(--gray) border border-(--graphite) shadow-xl rounded-sm p-3 w-48 
                flex flex-col gap-2 animate-in zoom-in-95 duration-100"
                style={{ 
                    left: tpoPopover.x, // Prevent overflow right
                    top: tpoPopover.y// Prevent overflow bottom
                }}> 
                    <div className="flex justify-between items-center border-b border-[#303030] pb-2">
                        <span className="font-bold text-sm flex items-center gap-2">
                            <Info size={14} className="text-[#2962FF]"/>
                            {formatDate(tpoPopover.data.time)}
                        </span>
                        <button onClick={() => setTpoPopover(null)} className="p-1 hover:text-(--red) hover:bg-(--redT)">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex flex-col text-xs gap-1 text-gray-300">
                        <div className="flex justify-between">
                            <span>POC:</span>
                            <span className="text-[#FFD700] font-mono">{tpoPopover.data.levels.poc}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VA High:</span>
                            <span className="text-[#2962FF] font-mono">{tpoPopover.data.levels.vah}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VA Low:</span>
                            <span className="text-[#2962FF] font-mono">{tpoPopover.data.levels.val}</span>
                        </div>
                        <div className="border-t border-[#303030] my-1"></div>
                        <div className="flex justify-between">
                            <span>Above POC:</span>
                            <span>{tpoPopover.data.stats.above}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Below POC:</span>
                            <span>{tpoPopover.data.stats.below}</span>
                        </div>
                    </div>
                    <button onClick={() => onOpenTPOSettings()} 
                    className="mt-1 w-full flex items-center justify-center gap-2 py-1.5 bg-[#2c99c0] hover:bg-[#2c99c0]/80 text-white text-xs font-bold rounded-sm transition-colors">
                        <Settings className="w-4 h-4"/>
                        <span>Settings</span>
                    </button>
                    <button onClick={handleToggleSplit}
                    className="mt-1 w-full flex items-center justify-center gap-2 py-1.5 bg-[#2c99c0] hover:bg-[#2c99c0]/80 text-white text-xs font-bold rounded-sm transition-colors"
                    >
                        {tpoPopover.data.isExpanded ? <StepBack size={14}/> : <TrendingUpDown size={14}/>}
                        {tpoPopover.data.isExpanded ? "Merge Profile" : "Split Profile"}
                    </button>
                </div>
            )}
            {/* 1. ASSET INFO BADGE */}
                <div className="absolute top-2 left-4 z-45 flex items-center gap-2 px-3 py-2 bg-(--black)/20 border border-(--graphite) rounded-sm shadow-md">
                    {logoUrl ? (
                        <img 
                            src={logoUrl} 
                            alt={base} 
                            className="w-5 h-5 rounded-full"
                            onError={ (e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerText = base[0]; // Fallback to letter
                            }}
                        />
                    ): (
                        <span className="text-xs font-bold text-gray-400">{base ? base[0] : "?"}</span>
                    )}    
                    <div className="flex items-center gap-2 font-semibold leading-none">
                        <span>{base} / {quote}</span>
                        <span className="text-[10px] text-white bg-(--red) p-1 mx-2 rounded-sm">{timeframe}</span>
                    </div>
                    <span className="text-xs font-mono">BINANCE • SPOT</span>
                    <div className="w-px h-6 bg-gray-600 mx-4"></div>
                    <button onClick={() => setShowCandles(!showCandles)}
                    className="hover:text-(--red) mr-3">
                        {showCandles ? <Eye size={16}/> : <EyeOff size={16}/>}
                    </button>
                </div>
                {indicators.length > 0 && (
                <div className="absolute top-12 left-0 text-sm px-4 py-1 z-40">
                {/*<span className="flex items-center px-4 py-1 bg-(--black)/20 shadow-md rounded-sm border border-(--graphite) mb-1">
                    Indicators : 
                </span>*/}
                    {indicators.map((ind, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-1 bg-(--black)/20 rounded-sm border border-(--graphite) shadow-md mb-1">
                            <div className="flex gap-2 items-center">
                                <span>{ind.id.toUpperCase()}{ind.length ? ind.length : ""}</span>
                                {ind.color && (
                                    <div className="w-3 h-3 rounded-sm border border-(--gray)"
                                    style={{backgroundColor: ind.color}}/>
                                )}
                                </div>
                            <div className="flex gap-2 items-center ml-8">
                                {ind.id == "volume" && (
                                    <button onClick={() => openVolumeSettings(ind)} className="hover:text-(--red) cursor-pointer">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "ema" && (
                                    <button onClick={() => openEMAsettings(ind)} className="hover:text-(--red) cursor-pointer">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "tpo" && (
                                    <button onClick={() => onOpenTPOSettings(ind)} className="hover:text-(--red) cursor-pointer">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                <button onClick={() => onRemoveIndicator(ind)} className="hover:text-(--red) cursor-pointer">
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

            <div ref={toolbarRef} className="fixed top-20 left-1/2 transform -translate-x-1/2 z-45 flex gap-2 bg-(--gray) border-3 border-(--graphite) p-1 rounded-sm shadow-lg items-center">
                <div ref={toolbarHandleRef} className="ml-2 cursor-grab active:cursor-grabbing">
                    <GripVertical size={18}/>
                </div>
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button onClick={() => setCurrentTool(null)}
                className={`p-2 rounded hover:bg-(--primary)/40 ${!currentTool ? 'bg-(--primary)' : ''}`}>
                    <MousePointer2 size={18} />
                </button>
                <button onClick={() => setCurrentTool('line')}
                className={`p-2 rounded hover:bg-(--primary)/40 ${currentTool === 'line' ? 'bg-(--primary)' : ''}`}>
                    <Slash size={18} />
                </button>
                <button onClick={() => setCurrentTool('ray')}
                    className={`p-2 rounded hover:bg-(--primary)/40 ${currentTool === 'ray' ?'bg-(--primary)' : ''}`}>
                    <MoveHorizontal size={18} />
                </button>
                <button onClick={() => setCurrentTool('rect')}
                className={`p-2 rounded hover:bg-gray-700 ${currentTool === 'rect' ? 'bg-(--primary)' : ''}`}>
                    <Square size={18} />
                </button>
                 <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button onClick={() => { setDrawings([]); requestAnimationFrame(renderDrawings); }}
                className="p-2 rounded hover:bg-(--red)/40 hover:text-(--red)">
                    <Trash2 size={18} />
                </button>            
            </div>

            {drawingSettingsOpen && ( 
            // conditional check so they re-mount when opened (for useDraggable refs)
                <DrawingsSettings
                    open={drawingSettingsOpen}
                    onClose={() => setDrawingSettingsOpen(false)}
                    currentObject={editingObjectData}
                    onSave={handleSaveObjectSettings}
                    onDelete={handleDeleteObject}
                />
            )}

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