import React, {useEffect, useState} from "react";

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

    return (
        <div className="absolute top-2 right-22 z-40 font-mono text-lg font-bold select-none pointer-events-none px-4 py-1 bg-black/30 shadow-md"
        style={{ color: color }}
        >
            {timeString}
        </div>
    );
};

export default Clock;