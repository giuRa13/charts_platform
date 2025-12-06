import { Eye, EyeOff, CandlestickChart } from 'lucide-react';
import React, { useEffect, useState } from 'react'

const AssetBadge = ({selectedAsset,  timeframe, priceSeriesRef, isOffline, offlineSymbol}) => {

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

    const displayAsset = isOffline ? offlineSymbol : selectedAsset;

    const { base, quote } = parseSymbol(displayAsset);
    const logoUrl = !isOffline && base ? `https://assets.coincap.io/assets/icons/${base.toLowerCase()}@2x.png` : "";

    const getExchangeLabel = () => {
        if (!isOffline) return "BINANCE • SPOT";
        
        // Simple logic to detect Futures/Forex based on common naming conventions
        const s = base.toUpperCase();
        if (s.includes("CME") || s.includes("NQ") || s.includes("ES") || s.includes("6E")) return "CME • FUTURES";
        if (s.includes("EUR") || s.includes("USD") || s.includes("JPY")) return "FOREX";
        
        return "LOCAL FILE";
    };

    useEffect(() => {
        if (priceSeriesRef.current) {
            priceSeriesRef.current.applyOptions({
                visible: showCandles
            });
        }
    }, [showCandles]);

  return (
    <div className="absolute top-2 left-4 z-45 flex items-center gap-2 px-3 py-2 bg-(--black)/20 border border-(--graphite) rounded-sm shadow-md">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0">
        {logoUrl ? (
            <img 
            src={logoUrl} 
            alt={base} 
            className="w-full h-full rounded-full"
            onError={ (e) => {
                e.target.style.display = 'none';
                //e.target.parentElement.innerText = base[0]; // Fallback to letter
                // Show text fallback if image fails
                e.target.nextSibling.style.display = 'block'; 
            }}
            />
        ): (
            null
        )}    
            {/* Fallback Icon (Visible if no URL or Error) */}
            <div style={{ display: logoUrl ? 'none' : 'flex' }} className="items-center justify-center w-full h-full text-gray-400">
                {isOffline ? <CandlestickChart size={18} /> : <span className="text-xs font-bold">{base[0]}</span>}
            </div>
        </div>

        <div className="flex items-center gap-2 font-semibold leading-none">
            <span>{base} {quote ? `/ ${quote}` : ""}</span>
            {isOffline ? (
                <span className="text-[9px] bg-yellow-600 text-black p-1 rounded-[2px]">OFFLINE</span>
            ) : (
                <span className="text-[9px] bg-[#2962FF] text-white p-1 rounded-[2px]">{timeframe}</span>
            )}
        </div>
        <span className="text-[12px] text-gray-400 font-mono lead flex items-center ing-none mt-1">
            {getExchangeLabel()}
        </span>
        <div className="w-px h-6 bg-(--graphite) mx-4"></div>
        <button onClick={() => setShowCandles(!showCandles)}
        title={showCandles ? "Hide Price" : "Show Price"}
        className="hover:text-(--red) mr-3">
            {showCandles ? <Eye size={16}/> : <EyeOff size={16}/>}
        </button>
    </div>
  );
};

export default AssetBadge;