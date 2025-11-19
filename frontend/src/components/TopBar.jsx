import AssetSelect from "./AssetSelect";
import SearchBar from "./SearchBar";
import TimeframeBtns from "./TimeframesBtns";

const TopBar = ({ assets, selectedAsset, onSelectAsset, timeframe, onSelectTimeframe }) => {

  const options = assets.map(a => ({
    label: a.symbol,
    value: a.symbol
  }));

  return (
    <div className="flex-shrink-0 h-16 bg-(--gray) flex items-center justify-between px-4 border-b border-(--red) overflow-visible">

      <div className="flex gap-8 w-[30%]">
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

       <div className="flex gap-4 w-[30%]">
        <SearchBar
          assets={assets}
          onSelectAsset={onSelectAsset}
        />
      </div>

      <div className="flex w-[30%]">
        <button className="ml-auto px-4 py-2 bg-(--red) hover:opacity-70">Action</button>
      </div>

    </div>
  );
};

export default TopBar;