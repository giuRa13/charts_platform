import { useState } from "react";
import Chart from "./components/Chart";
import TopBar from "./components/TopBar";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

function App() {
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3001/assets")
      .then(res => res.json())
      .then(data => {
          setAssetsList(data);
          // Default to BTCUSDT if it exists, otherwise first asset
          const defaultAsset = data.find(a => a.symbol === "BTCUSDT")?.symbol || data[0]?.symbol;
          if (defaultAsset) setSelectedAsset(defaultAsset);
      })
      .catch(err => console.error("Failed to fetch assets:", err));
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-(--gray) text-(--b)">

      <TopBar
        assets={assetsList}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        timeframe={timeframe}
        onSelectTimeframe={setTimeframe}
      />

      {/* Main content */}
      <div className="flex overflow-hidden"
      style={{ height: 'calc(100vh - 4rem)' }}> {/* 4rem = 16 * 1rem (top bar height) */}
        <PanelGroup direction="horizontal">
        {/* Chart */}
        <Panel minSize={20}>
        {/*<div className="flex-1 min-w-0">*/}
         <div className="w-full h-full">
          <Chart 
            selectedAsset={selectedAsset} 
            timeframe={timeframe} 
            panelOpen={isPanelOpen} />
        </div>
        </Panel>

        {isPanelOpen && (
          <>
          <PanelResizeHandle className="w-1 bg-(--red)" />
          <Panel minSize={10} defaultSize={20}>
            <div className="w-full h-full border-l border-(--red)">
              <p className="p-2 text-(--red)">Panel A content</p>
            </div>
          </Panel>
          </>
        )}

      {/* Right sidebar */}
      <div className="flex-shrink-0 w-24 bg-(--gray) flex flex-col p-2 border-l border-(--red)">
        <button className="mb-2 px-2 py-2 bg-(--red)"
        onClick={() => setIsPanelOpen(p => !p)}>
          Btn A
        </button>
        <button className="px-2 py-2 bg-(--red)">Btn B</button>
      </div>
      </PanelGroup>

    </div>
  </div>
  );
}

export default App;