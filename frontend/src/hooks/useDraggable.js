import { useEffect, useRef } from "react";

export default function useDraggable(handleRef, elementRef) {
    const pos = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });

    useEffect(() => {
        const handle = handleRef.current;
        const el = elementRef.current;
        if (!handle || !el) return; // exit if elements are not mounted

        handle.style.cursor = "grab";

        const onMouseDown = (e) => {
            // Allow clicking buttons inside the handle (like the Close 'X') without dragging
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            e.preventDefault();
            pos.current.lastX = e.clientX;
            pos.current.lastY = e.clientY;

            document.body.style.cursor = "grabbing"; 
            handle.style.cursor = "grabbing";

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        const onMouseMove = (e) => {
            const dx = e.clientX - pos.current.lastX;
            const dy = e.clientY - pos.current.lastY;

            el.style.transform = `translate(${pos.current.x + dx}px, ${pos.current.y + dy}px)`;
        };

        const onMouseUp = (e) => {
            pos.current.x += e.clientX - pos.current.lastX;
            pos.current.y += e.clientY - pos.current.lastY;

            document.body.style.cursor = "";
            handle.style.cursor = "grab";

            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        handle.addEventListener("mousedown", onMouseDown);

        return () => {
            handle.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
        };
    }, [handleRef, elementRef]);

};