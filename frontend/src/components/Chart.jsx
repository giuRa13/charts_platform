import React, { useEffect, useRef } from "react";
import { CandlestickSeries, createChart, CrosshairMode } from "lightweight-charts";

const Chart = ({selectedAsset, timeframe, panelOpen}) => {

    const chartContainer = useRef();
    const seriesRef = useRef();
    const chartRef = useRef();
    const wsRef = useRef(null);

    const loadChart = (asset, timeframe) => {
        if (!asset) return;

        const container = chartContainer.current;

        // Remove any existing children to prevent duplicate charts
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const { width, height } = container.getBoundingClientRect();

        const chart = createChart(container, {
            //"#303031" 
            width,
            height,
            //autoSize: true,
            layout: { textColor: "#DCEDE3", background: { type: "solid", color: "#1e1e1e" } },
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
        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: false,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
        });

        chartRef.current = chart;
        seriesRef.current = series;

        fetch(`http://localhost:3001/history/${asset}/${timeframe}`)
            .then((res) => res.json())
            .then((data) => {
                console.log("Loaded historical candles:", data.length);
                series.setData(data);
                setTimeout(() => chart.timeScale().fitContent(), 50);
            })
            .catch((err) => console.error("History fetch error:", err));
        
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
            };
            series.update(candle);
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
    }, [selectedAsset, timeframe]);

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

export default Chart;