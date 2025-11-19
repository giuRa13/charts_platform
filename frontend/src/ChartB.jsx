import React, { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, CrosshairMode } from "lightweight-charts";

const Chart = () => {

    const chartContainer = useRef();
    const candlestickSeriesRef = useRef();
    const chartRef = useRef();
    const lastCandleRef = useRef(null);
    const lastTimeRef = useRef(null);

    useEffect(() => {
    const container = chartContainer.current;

    // Remove any existing children to prevent duplicate charts
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const chart = createChart(container, {
        width: 600,
        height: 300,
        layout: { textColor: "#DCEDE3", background: { type: "solid", color: "#303031" } },
        grid: { vertLines: { color: "#535151ff" }, horzLines: { visible: false } },
        crosshair: { mode: CrosshairMode.Normal },
    });
    const priceScale = chart.priceScale('right'); // 'right' is default
    priceScale.applyOptions({
        scaleMargins: { top: 0.2, bottom: 0.2 },
        borderVisible: true,
        borderColor: '#7c7c7cff'
    });
    chart.timeScale().applyOptions({
        rightOffset: 10,       // space on the right so candles are not stuck
        barSpacing: 15,        // space between candles
        fixLeftEdge: false,    // allow scrolling left
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: true, // last bar stays at the right
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#7c7c7cff'
    });
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
    });

    candlestickSeriesRef.current = candlestickSeries;
    chartRef.current = chart;

    // WebSocket connection code...
    const ws = new WebSocket("ws://localhost:3001");
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const k = msg.k;
        const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            isClosed: k.x,
        };
        candlestickSeries.update(candle);
        lastCandleRef.current = candle;
        lastTimeRef.current = candle.time;
    };

    return () => ws.close();
}, []);

    return <div ref={chartContainer}></div>;
};

export default Chart;