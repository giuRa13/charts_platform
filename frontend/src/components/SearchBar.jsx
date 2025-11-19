import React, { useEffect, useRef, useState }  from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({assets, onSelectAsset}) => {

    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const filtered = query ? 
        assets.filter(a => a.symbol.toLowerCase().includes(query.toLowerCase()))
        : [];

    const showList = open && filtered.length > 0;

    // click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
            setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function highlightmatch(symbol, query) {
        if(!query) return symbol;

        const regex = new RegExp(`(${query})`, "i");
        const parts = symbol.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="text-(--accent) font-bold">
                    {part}
                </span>
            ) : (
                <span key={i}>{part}</span>
            )
        );
    };

    return (
        <div ref={containerRef} className="relative w-full">
   
            <div onClick={() => setOpen(true)} 
            className="flex items-center border border-(--red) bg-(--gray) px-3 py-2 text-(--red)">
                <Search className="w-5 h-5" />
                <input
                className="ml-3 bg-transparent w-full outline-none text-(--red)"
                placeholder="Search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true);}}
                />
            </div>

            {showList && (
            <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-(--gray) text-(--red) border border-(--red) z-50">
                {filtered.map(asset => (
                    <div
                    key={asset.symbol}
                    onClick={() => {
                        onSelectAsset(asset.symbol);
                        setQuery("");
                        setOpen(false);
                    }}
                    className="px-3 py-2 cursor-pointer hover:bg-(--red) hover:text-black"
                    >
                        {highlightmatch(asset.symbol, query)}
                    </div>
                ))}
            </div>
            )}

        </div>
    )
};

export default SearchBar;
