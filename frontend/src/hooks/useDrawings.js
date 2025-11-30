import { useState, useRef, useEffect } from "react";

export const useDrawings = (chartRef, seriesRef, containerRef, onOpenSettings) => {

    const [drawings, setDrawings] = useState([]);  // Array of { type, p1: {time, price}, p2: {time, price} } (kust trigger React updates)
    const [isDrawing, setIsDrawing] = useState(false); 
    const [selectedDrawingIndex, setSelectedDrawingIndex] = useState(null);
    const [currentTool, setCurrentTool] = useState(null);

    const drawingsRef = useRef([]); // allows the canvas to read the latest data instantly without waiting for React's render cycle
    const canvasRef = useRef(null);

    const interactionRef = useRef(null); // track dragging state: { index: number, part: 'p1' | 'p2' | 'body', lastCoords: {time, price} }
    const tempDrawingRef = useRef(null); // Tracks the shape currently being dragged (only for creating)
    const selectionRef = useRef(null);

    // // a^2 + b^2 = c^2 ---> (horizontal dist)^2 + (vertical dist)^2  = distance^2
    const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

    // Calculates the shortest distance from a point [p](mouse) to a line segment defined by start[v] and end[w]
    const distanceToSegment = (p, v, w) => {
        const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2); // lenght^2 (how long line segment is)
        if (l2 === 0) return getDistance(p, v);  

        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2; // projection
        // if 0, the mouse is perpendicular to the Start point [v]
        // if 1, the mouse is perpendicular to the End point [w]
        t = Math.max(0, Math.min(1, t));
        return getDistance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }); // { } calculate exact coordinates of the Closest Point on the line segment
    };

    // Checks if a point [p](mouse) is strictly inside a rectangle defined by corners start and end.
    const isPointInRect = (p, start, end) => {
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    };

    // --- COORDINATES SYSTEM ------------------------------------------------------
    //------------------------------------------------------------------------------

    // convert Logical Data (Time/Price) --to--> Screen Pixels (x, y)
    // allow drawing lines even if one point is off-screen
    // treat 'null' coordinates as "far off screen" to keep the line direction correct
    const safeGetPixel = (time, price) => {
        if (!chartRef.current || !seriesRef.current || !canvasRef.current) return { x: null, y: null };
        
        const timeScale = chartRef.current.timeScale();
        const series = seriesRef.current;
        let x = timeScale.timeToCoordinate(time);
        let y = series.priceToCoordinate(price);

        // Handle Off-Screen X (Time)    
        if (x === null) {
            // coordinateToTime, timeToCoordinate returns null if offscreen.
            // handle null in drawing logic, or try to approximate.
            const visibleRange = timeScale.getVisibleRange();
            if(visibleRange) {
                const canvasWidth = canvasRef.current.width;
                if(time < visibleRange.from) x = -5000; // far left
                else if (time > visibleRange.to) x = canvasWidth + 500 // far right
            }
        } 

        // Note: This is a fallback; usually not needed for PriceSeries
        // lightweight-charts usually returns a value for Y even if off-screen, but if it returns null
        if (y === null)
            y = -100

        return { x, y }; 
    };
    
    // converts Screen Pixels (x,y) --to--> Logical Data (Time/Price).
    // if click in the empty whitespace on the right or left, it snaps the time to the nearest valid candle
    const getChartCoordinates = (e) => {
        if (!chartRef.current || !seriesRef.current || !containerRef.current ) return null;

        const rect = containerRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        const timeScale = chartRef.current.timeScale();
        const series = seriesRef.current;

        // Try exact conversion
        let time = timeScale.coordinateToTime(x);
        let price = series.coordinateToPrice(y);

        // Handle Time Snapping (Left/Right Out of Bounds)
        if (time === null) {
            // getVisibleRange returns { from: Time, to: Time } of actual data
            // This ignores empty whitespace and gives us the last valid candle
            const visibleRange = timeScale.getVisibleRange();
            if (visibleRange) {
                if (x < 0) time = visibleRange.from;  // Left side: Snap to first visible candle
                else time = visibleRange.to; // Right side (Whitespace or Price Scale): Snap to last visible candle
            }
        }

        // Handle Price Snapping (Top/Bottom Out of Bounds)
        if (price === null) {
            // Clamp Y to the container height
            const clampedY = Math.max(0, Math.min(rect.height, y));
            price = series.coordinateToPrice(clampedY);
        }
        
        if (time === null || price === null) return null;

        return { time, price};
    };

    // --- HIT TEST FUNCTION ------------------------------------------------------
    //------------------------------------------------------------------------------
    const hitTest = (pixelPoint) => {
        const HANDLE_RADIUS = 10;
        const LINE_THRESHOLD = 7;
        const selectionIdx = selectionRef.current;

        // 1. Check Handles of Selected Object First
        if (selectionIdx !== null && drawingsRef.current[selectionIdx]) {
            const shape = drawingsRef.current[selectionIdx];
            const start = safeGetPixel(shape.p1.time, shape.p1.price);
            const end = safeGetPixel(shape.p2.time, shape.p2.price);
            if (getDistance(pixelPoint, start) <= HANDLE_RADIUS) return { index: selectionIdx, part: "p1" };
            const p2Handle = shape.type === 'ray' ? { x: chartRef.current.timeScale().width(), y: start.y } : end;
            if (getDistance(pixelPoint, p2Handle) <= HANDLE_RADIUS) return { index: selectionIdx, part: 'p2' };
        }

         // 2. Check Bodies of All Objects
        for(let i = drawingsRef.current.length - 1; i >= 0; i--) {
            const shape = drawingsRef.current[i];
            const start = safeGetPixel(shape.p1.time, shape.p1.price);
            const end = safeGetPixel(shape.p2.time, shape.p2.price);
            if (start.x === null || end.x === null) continue;

            if (shape.type === "line") {
                if (distanceToSegment(pixelPoint, start, end) < LINE_THRESHOLD) return {index: i, part: "body" };
            }
            else if (shape.type === "ray") {
                const chartWidth = chartRef.current.timeScale().width();
                const rayEnd = { x: chartWidth, y: start.y };
                if (distanceToSegment(pixelPoint, start, rayEnd) < LINE_THRESHOLD) return { index: i, part: "body" };
            }
            else if (shape.type === "rect") {
                if (isPointInRect(pixelPoint, start, end)) return {index: i, part: "body" };
            }
        }
    };

    // --- DRAWING LOOP ------------------------------------------------------------
    //------------------------------------------------------------------------------
    // runs on requestAnimationFrame (60fps)
    const renderDrawings = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !chartRef.current) return;

        // Get the width of the plotting area (excluding price scale)
        const chartWidth = chartRef.current.timeScale().width();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // --- CLIPPING REGION --- ensures NO shapes draw over the price scale
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, chartWidth, canvas.height);
        ctx.clip();

        const drawShape = (shape, isSelected) => {
            const start = safeGetPixel(shape.p1.time, shape.p1.price);
            const end = safeGetPixel(shape.p2.time, shape.p2.price);
            if (start.x === null || end.x === null) return;

            ctx.lineWidth = shape.lineWidth || 2;
            ctx.strokeStyle = shape.color || "#e490d9";
            ctx.fillStyle = shape.type === 'rect' 
                ? (shape.color ? shape.color + '33' : 'rgba(228, 144, 217, 0.1)') // Add simple hex opacity or default
                : 'transparent';

            ctx.beginPath();

            if (shape.type === "line") {
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
            else if (shape.type === "ray") {                
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(chartWidth, start.y); 
                ctx.stroke();
            }
            else if (shape.type === "rect") {
                const width = end.x - start.x;
                const height = end.y - start.y;
                ctx.rect(start.x, start.y, width, height);
                ctx.fill();
                ctx.stroke();
            }

            // Draw Handles if selected
            if (isSelected) {
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#00a8c2';
                ctx.lineWidth = 1;

                const drawHandle = (x, y) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                };
                
                drawHandle(start.x, start.y);
                if (shape.type === 'ray') drawHandle(end.x, start.y); 
                else drawHandle(end.x, end.y);
            }
        };

        const selectionIdx = selectionRef.current;
        if (drawingsRef.current) drawingsRef.current.forEach((shape, i) => drawShape(shape, i === selectionIdx));
        if (tempDrawingRef.current) drawShape(tempDrawingRef.current, false);

        ctx.restore();
    };

    // --- UPDATE A DRAWING (SETTINGS PANEL) ---
    const updateDrawing = (index, newAttributes) => {
        setDrawings(prev => {
            const copy = [...prev];
            if (copy[index]) {
                copy[index] = { ...copy[index], ...newAttributes };
            }
            return copy;
        });
    };

    // --- REMOVE SELECTED DRAWING ---
    const removeDrawing = (index) => {
        setDrawings(prev => {
            const newDrawings = prev.filter((_, i) => i !== index);
            return newDrawings;
        });
        setSelectedDrawingIndex(null); // Deselect
        selectionRef.current = null;
        requestAnimationFrame(renderDrawings);
    };

    // --- DOUBLE CLICK (open obj settings) ------------------------------------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        if(!container) return;

        const handleDblClick = (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const hit = hitTest({ x, y });
            if(hit && onOpenSettings) {
                // Call the parent callback with the index and object
                onOpenSettings(hit.index, drawingsRef.current[hit.index]);
            }
        };

        container.addEventListener('dblclick', handleDblClick);
        return () => container.removeEventListener('dblclick', handleDblClick);
    }, [onOpenSettings, drawings]);

    // --- Sync State -> Ref (for when loading or clearing) -----------------------------------------------------
    useEffect(() => {
        drawingsRef.current = drawings;
        selectionRef.current = selectedDrawingIndex;
        requestAnimationFrame(renderDrawings);
    }, [drawings, selectedDrawingIndex]);

    // --- INTERACTION LOGIC (BRAIN) ------------------------------------------------------------
    //------------------------------------------------------------------------------------------
    useEffect(() => {
        if (!chartRef.current) return;
        const timeScale = chartRef.current.timeScale();

        // 1. Standard API Events (Scroll/Tick)
        // when scroll/zoom the chart, the canvas is just a static image overlay. It needs to redraw instantly to match the new candle positions
        const handleTimeChange = () => requestAnimationFrame(renderDrawings);
        timeScale.subscribeVisibleTimeRangeChange(handleTimeChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleTimeChange);
        window.addEventListener('resize', handleTimeChange);

         // 2. Interaction Loop (For Dragging Chart / Price Scale)
        // Lightweight charts doesn't emit events for every frame of a drag.
        // We must start a render loop when the user presses down on the chart.
        let animationFrameId;
        let isInteracting = false;

        const startLoop = () => {
            if (!isInteracting) return;
            renderDrawings();
            animationFrameId = requestAnimationFrame(startLoop);
        };
        
        const onContainerMouseDown = () => {
            // Only start loop if NOT drawing a shape (panning the chart)
            if (!currentTool && !interactionRef.current) {
                isInteracting = true;
                startLoop();
            }
        };

        const onContainerMouseUp = () => {
            isInteracting = false;
            cancelAnimationFrame(animationFrameId);
            requestAnimationFrame(renderDrawings); // Final sync
        };

        const container = containerRef.current;
        if(container) {
            container.addEventListener('mousedown', onContainerMouseDown);
            window.addEventListener('mouseup', onContainerMouseUp);
        }

        return () => {
            timeScale.unsubscribeVisibleTimeRangeChange(handleTimeChange);
            timeScale.unsubscribeVisibleLogicalRangeChange(handleTimeChange);
            window.removeEventListener('resize', handleTimeChange);
            if(container) container.removeEventListener('mousedown', onContainerMouseDown);
            window.removeEventListener('mouseup', onContainerMouseUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [currentTool]);


    // --- SYNC WITH CHART SCROLL (pointerEvents)-------------------------------------------------
    //------------------------------------------------------------------------------
    // Problem: HTML Canvas blocks clicks. If Canvas is clickable, you can't drag the Chart. If Chart is clickable, you can't select Drawings.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleContainerMove = (e) => {
            // If dragging, ignore this (the global listener handles it)
            if (isDrawing || currentTool) {
                if(canvasRef.current)  { 
                    canvasRef.current.style.pointerEvents = 'auto';
                    canvasRef.current.style.cursor = 'crosshair';
                }
                return;
            }

            const rect = container.getBoundingClientRect();
            const hit = hitTest({ x: e.clientX - rect.left, y: e.clientY - rect.top });

            if (canvasRef.current) {
                canvasRef.current.style.pointerEvents = hit ? 'auto' : 'none';
                canvasRef.current.style.cursor = hit ? (hit.part === 'body' ? 'move' : 'grab') : 'default';
            }
        };

        container.addEventListener('mousemove', handleContainerMove);
        return () => container.removeEventListener('mousemove', handleContainerMove);

    }, [isDrawing, currentTool, drawings, selectedDrawingIndex]);

    // --- MOUSE DOWN ON CONTAINER (Capture Phase) ------------------------------------------------------------------
    // need to decide Who gets the click first? You or the Chart Library?
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleContainerMouseDown = (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const coords = getChartCoordinates(e);

            // 1. CREATING
            if (currentTool) {
                if (!coords) return;
                e.preventDefault(); // Stop chart from stealing the click
                e.stopPropagation();

                selectionRef.current = null;
                setSelectedDrawingIndex(null); 

                tempDrawingRef.current = { type: currentTool, p1: coords, p2: coords };
                setIsDrawing(true);
                return;
            }
            
            const hit = hitTest({ x, y });
            if (hit) {
                // HIT: Select shape, Stop Chart Panning, Start Dragging
                e.preventDefault();
                e.stopPropagation(); // Don't let Chart see this click!
                
                selectionRef.current = hit.index; 
                setSelectedDrawingIndex(hit.index);

                interactionRef.current = {
                    index: hit.index,
                    part: hit.part, 
                    startPixel: { x, y }, 
                    initialShape: { ...drawingsRef.current[hit.index] } 
                };
                setIsDrawing(true);
            } else {
                // MISS: Deselect immediately. Do NOT stop propagation (let chart pan)
                if (selectedDrawingIndex !== null) {
                    selectionRef.current = null;
                    setSelectedDrawingIndex(null);
                    interactionRef.current = null;
                }
            }
            requestAnimationFrame(renderDrawings);
        };

        // Use Capture Phase to intercept before Chart does
        container.addEventListener('mousedown', handleContainerMouseDown, { capture: true });
        return () => container.removeEventListener('mousedown', handleContainerMouseDown, { capture: true });

    }, [currentTool, drawings, selectedDrawingIndex]);

    // --- GLOBAL MOUSE LISTENERS  ( Mouse Up, Mouse Move)--------------------------------------------
    // ----------------------------------------------------------------------------------------------------------------
    // p1 / p2 ---> (Resize): Updates just that coordinate.
    // body ---> (Move)
    useEffect(() => {
        if (!isDrawing) return;

        const handleWindowMouseMove = (e) => {
            if(!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            const coords = getChartCoordinates(e); 
            if (!coords) return;

            // CASE A: Creating new Shape
            if (tempDrawingRef.current) {
                tempDrawingRef.current = { ...tempDrawingRef.current, p2: coords };
                requestAnimationFrame(renderDrawings);
                return;
            }

            // CASE B: Dragging/Resizing Existing Shape
            if (interactionRef.current) {
                const { index, part, startPixel } = interactionRef.current;
                const shape = { ...drawingsRef.current[index] };
                const timeScale = chartRef.current.timeScale();
                const series = seriesRef.current;
            
                if (part === 'p1') {
                    shape.p1 = coords;
                    // Ray Logic: If moving P1, P2 X should stay relative or just move P1? 
                    // Let's just move P1.
                } 
                else if (part === 'p2') {
                    shape.p2 = coords;
                }
                else if (part === 'body') {
                    // 1. Calculate how many pixels the mouse moved since start of drag
                    const dx = (e.clientX - rect.left) - startPixel.x;
                    const dy = (e.clientY - rect.top) - startPixel.y;
                    // 2. Get original shape pixels (from start of drag)
                    const p1Pixel = safeGetPixel(interactionRef.current.initialShape.p1.time, interactionRef.current.initialShape.p1.price);
                    const p2Pixel = safeGetPixel(interactionRef.current.initialShape.p2.time, interactionRef.current.initialShape.p2.price);
                     // 3. Add delta to original pixels
                    const newP1Pixel = { x: p1Pixel.x + dx, y: p1Pixel.y + dy };
                    const newP2Pixel = { x: p2Pixel.x + dx, y: p2Pixel.y + dy };
                    // 4. Convert back to Time/Price
                    const newP1Time = timeScale.coordinateToTime(newP1Pixel.x);
                    const newP1Price = series.coordinateToPrice(newP1Pixel.y);
                    const newP2Time = timeScale.coordinateToTime(newP2Pixel.x);
                    const newP2Price = series.coordinateToPrice(newP2Pixel.y);

                    // Only update if conversion was valid
                    if(newP1Time && newP1Price && newP2Time && newP2Price) {
                        shape.p1 = { time: newP1Time, price: newP1Price };
                        shape.p2 = { time: newP2Time, price: newP2Price };
                    }
                }

                drawingsRef.current[index] = shape;
                requestAnimationFrame(renderDrawings);
            }
        };

        const handleWindowMouseUp = () => {
            // Finish Creating
            if (tempDrawingRef.current) {
                const newIdx = drawingsRef.current.length;
                drawingsRef.current.push(tempDrawingRef.current);
                setDrawings([...drawingsRef.current]);

                tempDrawingRef.current = null;
                setCurrentTool(null);

                selectionRef.current = newIdx;
                setSelectedDrawingIndex(newIdx);
            }
            
            // Finish Dragging/Modifying
            if (interactionRef.current) {
                setDrawings([...drawingsRef.current]); // Commit ref to state
                interactionRef.current = null;
            }

            setIsDrawing(false);
            requestAnimationFrame(renderDrawings);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => { 
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };

    }, [isDrawing]);


    return {
        canvasRef,
        drawings,
        setDrawings,
        currentTool,
        setCurrentTool,
        renderDrawings, // export render so we can force call it on init
        updateDrawing,
        removeDrawing,
        interactionHandlers: {}
    };
};