import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react"; 

const AssetSelect = ({options, value, onChange}) => {

    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        function handleClick(e) {
            if(containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={containerRef}
        className="relative text-(--red) min-w-[140px]"
        >
            {/* Selected value */}
            <div onClick={() => setOpen(!open)}
            className="cursor-pointer px-3 py-2 border border-(--red) bg-(--gray) flex justify-between items-center"
            >
                <span>{selected ? selected.label : "Select"}</span>
                <ChevronDown className={`w-6 h-6 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}/>
            </div>

            {/* Dropdown list */}
            { open && (
                <div className="absolute left-0 mt-1 w-full max-h-[400px] bg-(--gray) border border-(--red) z-50 overflow-y-auto overflow-x-hidden">
                    {options.map(opt => {
                        return(
                        <div key={opt.value}
                        onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                        }}
                        className={`
                            px-3 py-2 cursor-pointer
                            hover:bg-(--red) hover:text-black
                            ${value === opt.value ? "bg-(--red) text-black" : ""}
                        `}>
                            {opt.label}
                        </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default AssetSelect;