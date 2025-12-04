import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react'

const AssetBadge = ({selectedAsset,  timeframe, priceSeriesRef}) => {

    const [showCandles, setShowCandles] = useState(true);

    const parseSymbol = (symbol) => {
        if (!symbol) return { base: "", quote: "" };
        
        const knownQuotes = ["USDT", "USDC", "BUSD", "TUSD", "USD", "EUR", "BTC", "ETH", "BNB"];
        
        for (const quote of knownQuotes) {
            if (symbol.endsWith(quote)) {
                return {
                    base: symbol.slice(0, -quote.length),
                    quote: quote
                };
            }
        }
        
        // Fallback if unknown quote (e.g. for some unique pairs)
        return { base: symbol, quote: "" };
    };

    const { base, quote } = parseSymbol(selectedAsset);
    const logoUrl = base ? `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png` : "";

    useEffect(() => {
        if (priceSeriesRef.current) {
            priceSeriesRef.current.applyOptions({
                visible: showCandles
            });
        }
    }, [showCandles]);

  return (
    <div className="absolute top-2 left-4 z-45 flex items-center gap-2 px-3 py-2 bg-(--black)/20 border border-(--graphite) rounded-sm shadow-md">
        {logoUrl ? (
            <img 
            src={logoUrl} 
            alt={base} 
            className="w-5 h-5 rounded-full"
            onError={ (e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerText = base[0]; // Fallback to letter
            }}
            />
        ): (
            <span className="text-xs font-bold text-gray-400">{base ? base[0] : "?"}</span>
        )}    
        <div className="flex items-center gap-2 font-semibold leading-none">
            <span>{base} / {quote}</span>
            <span className="text-[10px] text-white bg-(--red) p-1 mx-2 rounded-sm">{timeframe}</span>
        </div>
        <span className="text-xs font-mono">BINANCE • SPOT</span>
        <div className="w-px h-6 bg-(--graphite) mx-4"></div>
        <button onClick={() => setShowCandles(!showCandles)}
        className="hover:text-(--red) mr-3">
            {showCandles ? <Eye size={16}/> : <EyeOff size={16}/>}
        </button>
    </div>
  );
};

export default AssetBadge;