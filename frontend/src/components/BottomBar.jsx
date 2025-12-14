import { Zap, ZapOff } from "lucide-react"; 

const BottomBar = ({isOffline, isProMode, onToggleProMode}) => {

  const minuteColor = !isProMode ? "bg-green-400" : "bg-orange-400";
  const tickColor   = isProMode  ? "bg-green-400" : "bg-(--red)";

  return (
    <div className="flex-shrink-0 h-16 bg-(--gray) flex items-center justify-between px-4 border-b border-t-4 border-(--graphite) overflow-visible">

        <button className="px-4 py-0.5 bg-(--primaryT) border border-(--primary) hover:opacity-70">Action</button>
        
        {!isOffline && (
        <div className="flex items-center gap-8">

          <div className="w-px h-6 bg-(--graphite) mx-1"></div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${minuteColor}`}></div>
            <span>Minute Data</span>
          </div>
          <div className="w-px h-6 bg-(--graphite) mx-1"></div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${tickColor}`}></div>
            <span>Tick Data</span>
          </div>

          <div className="w-px h-6 bg-(--graphite) mx-1"></div>

          <button onClick={onToggleProMode}
          title="Change Feed"
          className={`flex items-center gap-2 px-3 py-1 text-sm font-bold border cursor-pointer transition-colors ${
                    isProMode 
                    ? "bg-(--primary)/50 border-(--primary) text-purple-200" 
                    : "bg-[#303030] border-gray-600 text-gray-400 hover:text-white"
                }`}
          >
            {isProMode ? <Zap size={16} fill="currentColor" /> : <ZapOff size={16} />}
            <span>{isProMode ? "PRO FEED" : "LITE FEED"}</span>
          </button>
        </div>
        )}
    </div>
  );
};

export default BottomBar;