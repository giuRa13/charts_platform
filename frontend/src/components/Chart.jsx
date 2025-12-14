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
import AssetBadge from "./Assetbadge";


const Chart = ({
    isProMode,
    selectedAsset, 
    timeframe, 
    panelOpen, 
    indicators = [], 
    onIndicatorsChange, 
    chartSettings,
    onOpenTPOSettings,
    onOpenSVPSettings,
    onOpenFpSettings,
    //offline
    isOffline,     
    offlineData,   
    offlineSymbol,
}) => {

    const chartContainer = useRef();
    const chartRef = useRef();

    const priceSeriesRef = useRef(null);
    const seriesMapRef = useRef({}); // store active indicators(drawing props)
    const indicatorsRef = useRef(indicators); // track live indicators(volume, histograms need to know which color is up/down every time)

    const wsRef = useRef(null);
    const candlesRef = useRef([]); // local copy of history + live candles
    const lastMsgRef = useRef([]);

    const [EMAsettingsOpen, setEMAsettingsOpen] = useState(false);
    const [volumeSettingsOpen, setVolumeSettingsOpen] = useState(false);
    const [editingIndicator, setEditingIndicator] = useState(null);
    const [tpoPopover, setTpoPopover] = useState(null);

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

    //sync ref with state
    useEffect(() => { 
        indicatorsRef.current = indicators;
    }, [indicators]);

    useChartIndicators(chartRef, seriesMapRef, indicators, candlesRef, priceSeriesRef);

    useChartSettings(chartRef, priceSeriesRef, chartSettings);

    const toolbarRef = useRef(null);
    const toolbarHandleRef = useRef(null);
    useDraggable(toolbarHandleRef, toolbarRef);

    // create chart once //////////////////////////////////////////////////////////
    useEffect(() => {
        const container = chartContainer.current;
        if (!container) return;

        const chart = createChart(container, {
            layout: { 
                attributionLogo: false ,
                textColor: chartSettings.textColor,
                background: { type: "solid", color: chartSettings.backgroundColor },
                panes: {
                    separatorColor: "#007ACC", 
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
        let rawCandle = null;
        let diffData = null;

        if (isProMode) {
            // --- SERVER B (Pro) ---
            const incoming = {
                time: msg.time,
                open: msg.open, high: msg.high, low: msg.low, close: msg.close,
                volume: msg.volume, 
                delta: msg.delta, footprint: msg.footprint 
            };

            // 1. Calculate DIFFERENCE from last received message
            const prev = lastMsgRef.current;
            
            if (prev && prev.time === incoming.time) {
                // Same minute: Calculate diff
                diffData = {
                    ...incoming,
                    volume: incoming.volume - prev.volume,
                    delta: incoming.delta - prev.delta,
                    footprint: getFootprintDiff(prev.footprint, incoming.footprint)
                };
            } else {
                // New minute: Incoming IS the diff (starting from 0)
                diffData = incoming;
            }
            
            // Save state for next tick
            lastMsgRef.current = incoming;
            
            // Use the diff for chart update
            rawCandle = diffData;
            
        } else {
            // --- SERVER A (Lite) ---
            if (!msg.k) return;
            const k = msg.k;
            rawCandle = {
                time: Math.floor(k.t / 1000),
                open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v,
            };
        }
        
        if (!rawCandle) return;

        // 2. TIMEFRAME ALIGNMENT
        const tfSeconds = getTimeframeSeconds(timeframe);
        // Important: Use msg.time (actual time), not rawCandle.time (which might be diff)
        const actualTime = isProMode ? msg.time : rawCandle.time; 
        const bucketTime = Math.floor(actualTime / tfSeconds) * tfSeconds;

        let last = candlesRef.current[candlesRef.current.length - 1];
        let finalCandle = null;

        // 3. MERGE OR PUSH
        if (last && last.time === bucketTime) {
            // Merge the DIFF into the existing bucket
            finalCandle = mergeCandles(last, rawCandle);
            candlesRef.current[candlesRef.current.length - 1] = finalCandle;
        } else {
            // Start new bucket with current data
            // For Pro Mode, rawCandle is a diff, but for a new bar, the diff is the starting value.
            // We need to set the time correctly to the bucket time.
            finalCandle = { ...rawCandle, time: bucketTime };
            candlesRef.current.push(finalCandle);
        }

        // 4. Update Chart
        if (priceSeriesRef.current) {
            priceSeriesRef.current.update(finalCandle);
        }

        // 5. Update Indicators
        updateLiveIndicators(
            seriesMapRef.current, 
            indicatorsRef.current, 
            candlesRef.current
        );
    };

    // load history + open websocket when symbol/timeframe change //////////////////////////////
    const getFootprintDiff = (prevFp, currFp) => {
        const diff = {};
        if (!currFp) return diff;

        Object.entries(currFp).forEach(([price, vol]) => {
            // Get previous volume for this price (default to 0)
            const prevVol = prevFp && prevFp[price] ? prevFp[price] : { buy: 0, sell: 0 };
            
            // Calculate increase
            const buyDiff = vol.buy - prevVol.buy;
            const sellDiff = vol.sell - prevVol.sell;

            // If there is new volume, record it
            // Note: We ignore negative diffs (which happen when Python resets the minute)
            if (buyDiff > 0 || sellDiff > 0) {
                diff[price] = {
                    buy: buyDiff,
                    sell: sellDiff
                };
            }
        });
        return diff;
    };

    const mergeCandles = (existing, incoming) => {
        const merged = { ...existing };
        
        // 1. OHLC Update (Standard)
        merged.high = Math.max(existing.high, incoming.high);
        merged.low = Math.min(existing.low, incoming.low);
        merged.close = incoming.close;
        merged.volume = existing.volume + (incoming.volume || 0); // Add Diff Volume
        
        if (existing.delta !== undefined && incoming.delta !== undefined) {
             merged.delta = existing.delta + incoming.delta;
        }

        // 2. Footprint Deep Merge
        if (incoming.footprint) {
            if (!merged.footprint) merged.footprint = {};

            Object.entries(incoming.footprint).forEach(([price, vol]) => {
                if (!merged.footprint[price]) {
                    merged.footprint[price] = { buy: 0, sell: 0 };
                }
                // Add the Diff
                merged.footprint[price].buy += vol.buy;
                merged.footprint[price].sell += vol.sell;
            });
        }
        return merged;
    };

    const getTimeframeSeconds = (tf) => {
        if (tf === "1m") return 60;
        if (tf === "3m") return 180;
        if (tf === "5m") return 300;
        if (tf === "15m") return 900;
        if (tf === "30m") return 1800;
        if (tf === "1h") return 3600;
        if (tf === "4h") return 14400;
        return 60;
    };

    React.useEffect(() => {
        if (!chartRef.current) return;

        let isMounted = true;
        setLoading(true);

        // 1. Clear old data
        try { priceSeriesRef.current.setData([]); } catch (e) {console.log(e)}
        Object.values(seriesMapRef.current).forEach(s => { try { s.setData([]); } catch (e) {console.log(e)} });
        candlesRef.current = [];

         // 2A. OFFLINE MODE
        if (isOffline && offlineData.length > 0) {
            candlesRef.current = offlineData;
            priceSeriesRef.current.setData(offlineData);
            
            setIndicatorsData(seriesMapRef.current, indicatorsRef.current, offlineData);

            chartRef.current.priceScale('right').applyOptions({ autoScale: true });
            chartRef.current.timeScale().fitContent();
            setLoading(false);
            return; // STOP HERE
        }

        // 2B. ONLINE MODE
        if (!selectedAsset || !timeframe) {
            setLoading(false);
            return;
        }

        // Reset websocket
        let historyUrl = "";
        let wsUrl = "";
        
        if (isProMode) {
            console.log("Connecting to Orderflow Engine (Server B)...");
            historyUrl = `http://localhost:8000/history/footprint?symbol=${selectedAsset}&timeframe=${timeframe}`;
            wsUrl = "ws://localhost:8000/ws";
        } else {
            console.log("Connecting to Standard Proxy (Server A)...");
            historyUrl = `http://localhost:3001/history/${selectedAsset}/${timeframe}`;
            wsUrl = `ws://localhost:3001?symbol=${selectedAsset}&timeframe=${timeframe}`;
        }

        //fetch(`http://localhost:3001/history/${selectedAsset}/${timeframe}`)
        fetch(historyUrl)
        .then(r => r.json())
        .then(history => {
            if (!isMounted) return;
             // Safety: If Pro Mode returns empty (no ticks in DB yet)
            if (isProMode && (!history || history.length === 0)) {
                console.warn("No Orderflow history found. Start the Ingestor!");
                setLoading(false);
                return;
            }
            candlesRef.current = history;
            priceSeriesRef.current.setData(history);
            setIndicatorsData(seriesMapRef.current, indicatorsRef.current, history);
            //chartRef.current.priceScale('right').applyOptions({ autoScale: true });
            //chartRef.current.timeScale().fitContent();

            // auto zoom for Footprint
            const hasFootprint = indicatorsRef.current.find(i => i.id === 'footprint' && i.visible !== false);
            if (hasFootprint && history.length > 0) {
                // Zoom to last 20 candles
                const total = history.length;
                const from = Math.max(0, total - 20); 
                const to = total;
                
                chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
            } else {
                // Default behavior
                chartRef.current.timeScale().fitContent();
            }

            chartRef.current.priceScale('right').applyOptions({ autoScale: true });

        })
        .catch(err => console.error("History fetch error:", err))
        .finally(() =>{ if (isMounted) setLoading(false); });


        //wsRef.current = new WebSocket(`ws://localhost:3001?symbol=${selectedAsset}&timeframe=${timeframe}`);
        if (wsRef.current) {
            wsRef.current.close();
        }
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onopen = () => console.log(`Connected to ${isProMode ? "PRO" : "LITE"} stream`);
        wsRef.current.onmessage = (evt) => handleRealtime(JSON.parse(evt.data));
        wsRef.current.onerror = (e) => console.warn("WS error", e);
        
        return () => {
            isMounted = false;
            if (wsRef.current) {
                try { wsRef.current.close(); } catch (e) {console.log(e)}
                wsRef.current = null;
            }
        };

    }, [selectedAsset, timeframe, isOffline, offlineData, isProMode]);


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

    // dynamic zoom when adding indicator
    // If user clicks "Add Footprint" while already viewing the chart
    useEffect(() => {
        const hasFootprint = indicators.find(i => i.id === 'footprint' && i.visible !== false);
        
        if (hasFootprint && chartRef.current && candlesRef.current.length > 0) {
            const total = candlesRef.current.length;
            const from = Math.max(0, total - 20);
            const to = total + 2; // +2 for whitespace right
            
            chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
        }
    }, [indicators]);


    /// Indicators ////////////////////////////////////////////////////////////////////////

    // toggle visibility
    const handleToggleVisibility = (index) => {
        const newindicators = [...indicators];
        newindicators[index].visible = !newindicators[index].visible;
        onIndicatorsChange(newindicators);
    };

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

            {/* --- TPO FLOAT TOOLTIP/BUTTON --- */}
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

                <AssetBadge 
                selectedAsset={selectedAsset} 
                timeframe={timeframe} 
                priceSeriesRef={priceSeriesRef}
                isOffline={isOffline}
                offlineSymbol={offlineSymbol}
                />

                {/* INDICATORS BADGES */}
                {indicators.length > 0 && (
                <div className="absolute top-12 left-0 text-sm px-4 py-1 z-40">
                {/*<span className="flex items-center px-4 py-1 bg-(--black)/20 shadow-md rounded-sm border border-(--graphite) mb-1">
                    Indicators : 
                </span>*/}
                    {indicators.map((ind, i) => (
                        <div key={i} className="flex items-center justify-between gap-26 px-4 py-1 bg-(--black)/20 rounded-sm border border-(--graphite) shadow-md mb-1">
                            <div className="flex gap-2 items-center">
                                <span>{ind.id.toUpperCase()}{ind.length ? ind.length : ""}</span>
                                {ind.color && (
                                    <div className="w-3 h-3 rounded-sm border border-(--gray)"
                                    style={{backgroundColor: ind.color}}/>
                                )}
                            </div>
                            <div className="flex gap-2 items-center ml-8">
                                <button onClick={() => handleToggleVisibility(i)}
                                title={ind.visible === false ? "Show" : "Hide"}
                                className="hover:text-(--primary) cursor-pointer">
                                    {ind.visible === false ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                                {ind.id == "volume" && (
                                    <button onClick={() => openVolumeSettings(ind)} className="hover:text-(--primary) cursor-pointer" title="Settings">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "ema" && (
                                    <button onClick={() => openEMAsettings(ind)} className="hover:text-(--primary) cursor-pointer" title="Settings">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "tpo" && (
                                    <button onClick={() => onOpenTPOSettings(ind)} className="hover:text-(--primary) cursor-pointer" title="Settings">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "svp" && (
                                    <button onClick={() => onOpenSVPSettings(ind)} className="hover:text-(--primary) cursor-pointer" title="Settings">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                {ind.id == "footprint" && (
                                    <button onClick={() => onOpenFpSettings(ind)} className="hover:text-(--primary) cursor-pointer" title="Settings">
                                        <Settings className="w-4 h-4"/>
                                    </button>
                                )}
                                <button onClick={() => onRemoveIndicator(ind)} className="hover:text-(--red) cursor-pointer" title="Remove">
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

            <div ref={toolbarRef} className="fixed top-20 left-1/2 transform -translate-x-1/2 z-45 flex gap-2 bg-(--gray) border-2 border-(--graphite) p-1 rounded-sm shadow-lg items-center">
                <div ref={toolbarHandleRef} 
                className="ml-2 cursor-grab active:cursor-grabbing text-(--text)/40 hover:text-(--text)">
                    <GripVertical size={18}/>
                </div>
                <div className="w-px h-6 bg-gray-600 mx-1"></div>           
                <button onClick={() => setCurrentTool(null)}
                title="Pointer"
                className={`p-2 rounded hover:bg-(--primary)/40 ${!currentTool ? 'bg-(--primary)' : ''}`}>
                    <MousePointer2 size={18} />
                </button>
                <button onClick={() => setCurrentTool('line')}
                title="Line"
                className={`p-2 rounded hover:bg-(--primary)/40 ${currentTool === 'line' ? 'bg-(--primary)' : ''}`}>
                    <Slash size={18} />
                </button>
                <button onClick={() => setCurrentTool('ray')}
                title="Ray"
                className={`p-2 rounded hover:bg-(--primary)/40 ${currentTool === 'ray' ?'bg-(--primary)' : ''}`}>
                    <MoveHorizontal size={18} />
                </button>
                <button onClick={() => setCurrentTool('rect')}
                title="Rect"
                className={`p-2 rounded hover:bg-(--primary)/40${currentTool === 'rect' ? 'bg-(--primary)' : ''}`}>
                    <Square size={18} />
                </button>
                 <div className="w-px h-6 bg-gray-600 mx-1"></div>
                <button onClick={() => { setDrawings([]); requestAnimationFrame(renderDrawings); }}
                title="Delete All"
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