import React, { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, CrosshairMode, HistogramSeries } from "lightweight-charts";
import { prepareVolumeData, updateLastVolume } from "../indicators/volume";

const ChartB = ({selectedAsset, timeframe, panelOpen, indicators}) => {

    const chartContainer = useRef();
    const chartRef = useRef();

    const priceSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);

    const wsRef = useRef(null);
    const candlesRef = useRef([]); // local copy of history + live candles

    const loadChart = async (asset, timeframe) => {
        if (!asset) return;

        const container = chartContainer.current;

        // Remove any existing children to prevent duplicate charts
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const { width, height } = container.getBoundingClientRect();

        const chart = createChart(container, {
            width,
            height,
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

        // Indicators
        let volumeSeries = null;
        if (indicators.includes("volume")) {
                volumeSeries = chart.addSeries(HistogramSeries,{
                priceFormat: {type: "volume"},
                lastValueVisible: true,
                enableResize: true,
                ensureEdgeTickMarksVisible: true,
            }, 1);

            volumeSeriesRef.current = volumeSeries;
        }

        const candlePane = chart.panes()[0];

        if (volumeSeries) {
            const volumePane = chart.panes()[1];
            candlePane.setStretchFactor(0.8);
            volumePane.setStretchFactor(0.2);

            volumePane.priceScale("right").applyOptions({
                autoScale: true,
                //mode:0,
                visible: true,
                ticksVisible: true,
                scaleMargins: {
                    top: 0,
                    bottom: 0,
                },
            })
        }

        candlePane.priceScale("right").applyOptions({
            autoScale: true,
            //mode:0,
            visible: true,
            ticksVisible: true,
        })

        const history = await fetch(`http://localhost:3001/history/${asset}/${timeframe}`)
            .then(r => r.json())
            .catch(err => {
                console.error("History fetch error:", err);
                return [];
            });

        candlesRef.current = history;

        priceSeries.setData(history);

        if (volumeSeries) {
            const volumeData = prepareVolumeData(history);
            volumeSeries.setData(volumeData);
        }

        setTimeout(() => chart.timeScale().fitContent(), 50);
        
        if (wsRef.current) wsRef.current.close(); // close old connection

        const newWs = new WebSocket(`ws://localhost:3001?symbol=${asset}&timeframe=${timeframe}`);
        newWs.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            const k = msg.k;
            if (!k) return;
            const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            };

            const last = candlesRef.current[candlesRef.current.length - 1];

            // Update/append candle
            if (last && candle.time === last.time) {
                candlesRef.current[candlesRef.current.length - 1] = candle;
            } else {
                candlesRef.current.push(candle);
            }

            priceSeries.update(candle);

            if (volumeSeries) {
                updateLastVolume(volumeSeries, candlesRef.current);
            }

        } catch (err) {
            console.warn("WS message parse error:", err);
        }
        };
        wsRef.current = newWs;
    };

    // loadChart + window resize + WebSocket management
    useEffect(() => {
        if(selectedAsset && timeframe) loadChart(selectedAsset, timeframe);

        const handleResize = () => {
            if (chartRef.current && chartContainer.current) {
                const { width, height } = chartContainer.current.getBoundingClientRect();
                chartRef.current.resize(width, height);
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // initial resize

        return () => {
            window.removeEventListener("resize", handleResize);
            // Cleanup on unmount
            if (wsRef.current) wsRef.current.close();
        }
    }, [selectedAsset, timeframe, indicators]);

    // resize when panelOpen toggles (manual delayed resize for layout shift)
    useEffect(() => {
        setTimeout(() => {
            if (!chartRef.current || !chartContainer.current) return;
            const { width, height } = chartContainer.current.getBoundingClientRect();
            chartRef.current.resize(width, height);
        }, 50);
    }, [panelOpen]);

    // automatic resize when container changes size (drag panel)
    useEffect(() => {
        if (!chartContainer.current || !chartRef.current) return;

        const ro = new ResizeObserver(() => {
            const { width, height } = chartContainer.current.getBoundingClientRect();
            chartRef.current.resize(width, height);
        });

        ro.observe(chartContainer.current);

        return () => ro.disconnect();
    }, []);

    return (
        <div ref={chartContainer} className="chart-container w-full h-full"></div>

    );
};

export default ChartB;