import React, { useState } from "react";
import Chart from "./components/Chart";
import TopBar from "./components/TopBar";
import BottomBar from "./components/BottomBar";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import IndicatorsModal from "./components/modals/IndicatorsModal";
import ChartSettings from "./components/modals/ChartSettings";
import TPOsSettings from "./components/modals/TPOsSettings";
import { Menu } from "lucide-react";
import { Settings } from "lucide-react";

function App() {
  const [assetsList, setAssetsList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [showIndicators, setShowIndicators] = useState(false);
  const [indicators, setIndicators] = useState([]);

  const [tpoSettingsOpen, setTpoSettingsOpen] = useState(false);

  const [showChartSettings, setShowChartSettings] = useState(false);
  const [chartConfig, setChartConfig] = useState({
      backgroundColor: "#161616", /*"#131419",*/ /*"#000101",*///"#1e1e1e",
      textColor: "#DCEDE3",
      gridColor: "#303030",
      gridVertVisible: false,
      gridHorzVisible: false,
      candleUpColor: "#2c99c0", //"#008080",//"#088F79", 
      candleDownColor: "#be292d", // "#F33644", 
      magnetMode: false,
      showClock: false,
      clockColor: "#DCEDE3",
  });

  // Optional: Sync watermark with selected asset
  React.useEffect(() => {
     setChartConfig(prev => ({ ...prev}));
  }, [selectedAsset]);

  const handleAddIndicator = (indicatorId) => {
    
    setIndicators(prev => {

      if (indicatorId === "volume") {
        if (prev.find(ind => ind.id === "volume")) return prev;
        return [...prev, { id: "volume" , upColor: "#2c99c0", downColor: "#be292d" }];
      }

      if (indicatorId === "ema") {
        // Prevent add multiple ema
        //if (prev.find(ind => ind.id === "ema" && ind.length === 20)) return prev;
        return [
            ...prev,
            {
                id: "ema",
                length: 20,       
                color: "#c8b914" 
            }
        ];
      }

      // TPO Default
      if (indicatorId === "tpo") {
          if (prev.find(ind => ind.id === "tpo")) return prev;
          return [...prev, { 
            id: "tpo", 
            colorNormal: "#00378f", //"#68707d",
            colorVA: "#bababa", // "#2962FF",
            colorPOC: "#db8d1f", //#db1f57",
            colortext: "#B2B5BE",
            blockSize: 50,
            blockWidth: 8,
            showCounts: true,
            showLines: true,
            expand: false,
          }];
      }

      return [...prev, { id: indicatorId }];
    });
  };

  // TPO Save Handler
  const saveTPOSettings = (updatedIndicator) => {
      setIndicators(prev => prev.map(i => 
          i.id === "tpo" ? { ...i, ...updatedIndicator } : i
      ));
      setTpoSettingsOpen(false);
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
    <div className="w-screen h-screen flex flex-col bg-(--gray) text-(--text)">

      {showChartSettings && ( 
        // conditional check so they re-mount when opened (for useDraggable refs)
        <ChartSettings
          open={showChartSettings}
          onClose={() => setShowChartSettings(false)}
          currentSettings={chartConfig}
          onSave={setChartConfig}
        />
      )}

      {showIndicators && ( 
        // conditional check so they re-mount when opened (for useDraggable refs)
        <IndicatorsModal
          open={showIndicators}
          onClose={() => setShowIndicators(false)}
          onSelect={handleAddIndicator}
        />
      )}

      {/* TPO SETTINGS MODAL */}
      {tpoSettingsOpen && (
          <TPOsSettings
            open={tpoSettingsOpen}
            onClose={() => setTpoSettingsOpen(false)}
            initial={indicators.find(i => i.id === "tpo")}
            onSave={saveTPOSettings}
          />
      )}

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
            onOpenTPOSettings={() => setTpoSettingsOpen(true)} 
            onIndicatorsChange={setIndicators}
            chartSettings={chartConfig}/>
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
      <div className="flex-shrink-0 w-18 bg-(--gray) flex flex-col p-2 border-l-4 border-(--graphite)">
        <button className="mb-2 px-2 py-2 bg-(--primary) rounded-sm flex items-center justify-center cursor-pointer hover:opacity-70"
        onClick={() => setIsPanelOpen(p => !p)}>
          <Menu className="w-6 h-6"/>
        </button>
        <button className="mb-2 px-2 py-2 bg-(--primary) rounded-sm flex items-center justify-center cursor-pointer hover:opacity-70"
        onClick={() => setShowChartSettings(true)}>
          <Settings className="w-6 h-6"/>
        </button>
      </div>
      </PanelGroup>
    </div>

    <BottomBar/>

  </div>
  );
}

export default App;
