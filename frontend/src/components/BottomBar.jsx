import { Zap, ZapOff } from "lucide-react"; 

const BottomBar = ({isOffline, isProMode, onToggleProMode}) => {

  return (
    <div className="flex-shrink-0 h-16 bg-(--gray) flex items-center justify-between px-4 border-b border-t-4 border-(--graphite) overflow-visible">

        <button className="px-4 py-0.5 bg-(--primary) rounded-sm hover:opacity-70">Action</button>

        {!isOffline && (
          <button onClick={onToggleProMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-bold border transition-colors ${
                    isProMode 
                    ? "bg-purple-900/50 border-purple-500 text-purple-200" 
                    : "bg-[#303030] border-gray-600 text-gray-400 hover:text-white"
                }`}
          >
            {isProMode ? <Zap size={16} fill="currentColor" /> : <ZapOff size={16} />}
            <span>{isProMode ? "PRO FEED" : "LITE FEED"}</span>
          </button>
        )
        }

    </div>
  );
};

export default BottomBar;