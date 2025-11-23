import { useState } from "react";
import Chart from "./components/Chart";
import TopBar from "./components/TopBar";
import BottomBar from "./components/BottomBar";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Logs } from "lucide-react";
import IndicatorsModal from "./components/modals/IndicatorsModal";

function App() {
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [showIndicators, setShowIndicators] = useState(false);
  const [indicators, setIndicators] = useState([]);

  const handleAddIndicator = (indicatorId) => {
    
    setIndicators(prev => {

      if (indicatorId === "volume") {
        if (prev.find(ind => ind.id === "volume")) return prev;
        return [...prev, { id: "volume" , upColor: "#26a69a", downColor: "#ef5350" }];
      }

      if (indicatorId === "ema") {
        // Prevent add multiple ema
        //if (prev.find(ind => ind.id === "ema" && ind.length === 20)) return prev;
        return [
            ...prev,
            {
                id: "ema",
                length: 20,       
                color: "#f1c40f" 
            }
        ];
    }

      return [...prev, { id: indicatorId }];
    });
  };

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

      <IndicatorsModal
        open={showIndicators}
        onClose={() => setShowIndicators(false)}
        onSelect={handleAddIndicator}
      />

      <TopBar
        assets={assetsList}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        timeframe={timeframe}
        onSelectTimeframe={setTimeframe}
        onOpenIndicators={() => setShowIndicators(true)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden"> {/*style={{ height: 'calc(100vh - 4rem)'  4rem = 16 * 1rem (top bar height) */}
        <PanelGroup direction="horizontal">
        {/* Chart */}
        <Panel minSize={20}>
        {/*<div className="flex-1 min-w-0">*/}
         <div className="w-full h-full">
          <Chart 
            selectedAsset={selectedAsset} 
            timeframe={timeframe} 
            panelOpen={isPanelOpen}
            indicators={indicators} 
            onIndicatorsChange={setIndicators}/>
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
      <div className="flex-shrink-0 w-18 bg-(--gray) flex flex-col p-2 border-l border-(--red)">
        <button className="mb-2 px-2 py-2 bg-(--red) flex items-center justify-center cursor-pointer hover:opacity-70"
        onClick={() => setIsPanelOpen(p => !p)}>
          <Logs className="w-6 h-6"/>
        </button>
        <button className="px-2 py-2 bg-(--red)">Btn B</button>
      </div>
      </PanelGroup>
    </div>

    <BottomBar/>

  </div>
  );
}

export default App;
