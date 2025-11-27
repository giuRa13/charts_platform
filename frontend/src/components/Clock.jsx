import React, {useEffect, useRef, useState} from "react";
import useDraggable from "../hooks/useDraggable";
import { GripVertical } from "lucide-react";

const Clock = ({color}) => {

    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString('en-GB', { 
        hour12: true, 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });

    const clockRef = useRef(null);
    const clockHandleRef = useRef(null);
    useDraggable(clockHandleRef, clockRef);


    return (
                   
        <div ref={clockRef} className="fixed top-20 right-42 z-40 flex items-center font-mono text-lg font-bold select-none pointer-events-auto 
        px-4 py-2 bg-(--black)/20 rounded-sm border-2 border-(--graphite) shadow-md"
        style={{ color: color }}
        >
            <div ref={clockHandleRef} className="cursor-grab active:cursor-grabbing text-(--text)/60 hover:text-(--text)">
                <GripVertical size={18}/>     
            </div>
            <div className="w-px h-6 bg-(--graphite) mx-2"></div>
            <div className=" ml-2">
                {timeString}
            </div>
        </div>
    );
};

export default Clock;