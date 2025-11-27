import AssetSelect from "./AssetSelect";
import SearchBar from "./SearchBar";
import TimeframeBtns from "./TimeframesBtns";
import { ChartLineIcon } from "lucide-react";

const TopBar = ({ assets, selectedAsset, onSelectAsset, timeframe, onSelectTimeframe, onOpenIndicators }) => {

  const options = assets.map(a => ({
    label: a.symbol,
    value: a.symbol
  }));

  return (
    <div className="flex-shrink-0 h-16 items-center bg-(--gray) px-4 border-b-4 border-(--graphite) overflow-visible grid grid-cols-3">

      <div className="flex gap-16">
        <AssetSelect
          options={options}
          value={selectedAsset}
          onChange={onSelectAsset}
        />
        <TimeframeBtns
          timeframe={timeframe}             
          onSelectTimeframe={onSelectTimeframe} 
        />
      </div>

       <div className="flex justify-center md:flex hidden">
        <SearchBar
          assets={assets}
          onSelectAsset={onSelectAsset}
        />
      </div>

      <div className="flex justify-end">
        <button onClick={onOpenIndicators}
        className="px-4 py-1 flex items-center gap-2 bg-(--primary) hover:opacity-70 cursor-pointer rounded-sm text-(--text)">
          <ChartLineIcon size={22}/>
          Indicators
        </button>
      </div>

    </div>
  );
};

export default TopBar;