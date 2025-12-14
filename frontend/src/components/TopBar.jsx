import { parseCustomCSV } from "../csvParser";
import AssetSelect from "./AssetSelect";
import SearchBar from "./SearchBar";
import TimeframeBtns from "./TimeframesBtns";
import { ChartLineIcon, CloudOff, Upload } from "lucide-react";

const TopBar = ({ assets, selectedAsset, onSelectAsset, timeframe, onSelectTimeframe, onOpenIndicators,
  isOffline, onImportData, onExitOffline
 }) => {

  const options = assets.map(a => ({
    label: a.symbol,
    value: a.symbol
  }));

    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const parsedData = parseCustomCSV(text);

        if (parsedData.length > 0) {
          const symbolName = file.name.replace(".csv", "").toUpperCase();
          onImportData(parsedData, symbolName);
        }
        else {
          alert("No valid data found in CSV");
        }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  return (
    <div className="flex-shrink-0 h-16 items-center bg-(--gray) px-4 border-b-4 border-(--graphite) overflow-visible grid grid-cols-3">

      <div className="flex gap-16">
        { isOffline ? (
          <div className="flex items-center gap-3 bg-[#303030] px-3 py-1 rounded-sm border border-yellow-600/50">
                <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm">
                    <CloudOff size={16} />
                    <span>OFFLINE MODE</span>
                </div>
                <div className="w-px h-4 bg-gray-500"></div>
                <button onClick={onExitOffline}
                className="text-xs text-gray-300 hover:text-white hover:underline">
                    Exit
                </button>
            </div>
        ): (
          <AssetSelect
          options={options}
          value={selectedAsset}
          onChange={onSelectAsset}
          />
        )}
        {!isOffline && (
          <TimeframeBtns
            timeframe={timeframe}             
            onSelectTimeframe={onSelectTimeframe} 
          />
        )}
      </div>

       <div className="flex justify-center md:flex hidden">
        <SearchBar
          assets={assets}
          onSelectAsset={onSelectAsset}
        />
      </div>

      <div className="flex justify-end gap-8 pr-4">
        <button onClick={onOpenIndicators}
        className="px-4 py-1 flex items-center gap-2 bg-(--primaryT) border border-(--primary) hover:opacity-70 cursor-pointer text-(--text)">
          <ChartLineIcon size={22}/>
          Indicators
        </button>
        {!isOffline && (
            <label className="px-3 py-1 flex items-center gap-2 bg-(--primaryT) hover:opacity-70 cursor-pointer text-sm font-medium border border-(--primary) transition-colors">
                <Upload size={16} />
                <span>Import Data</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
        )}
        {!isOffline ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Live Data</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span>Offline Data</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default TopBar;