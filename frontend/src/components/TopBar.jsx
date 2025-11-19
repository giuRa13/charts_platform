import AssetSelect from "./AssetSelect";
import TimeframeBtns from "./TimeframesBtns";

const TopBar = ({ assets, selectedAsset, onSelectAsset, timeframe, onSelectTimeframe }) => {

  const options = assets.map(a => ({
    label: a.symbol,
    value: a.symbol
  }));

  return (
    <div className="flex-shrink-0 h-16 space-x-6 bg-(--gray) flex items-center px-4 border-b border-(--red) overflow-visible">

      <AssetSelect
        options={options}
        value={selectedAsset}
        onChange={onSelectAsset}
      />

      <TimeframeBtns
        timeframe={timeframe}             
        onSelectTimeframe={onSelectTimeframe} 
      />

      <button className="px-4 py-2 bg-(--red) hover:opacity-70">Action</button>

    </div>
  );
};

export default TopBar;