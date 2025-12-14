import React, { useState } from "react";
import Chart from "./components/Chart";
import TopBar from "./components/TopBar";
import BottomBar from "./components/BottomBar";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import IndicatorsModal from "./components/modals/IndicatorsModal";
import ChartSettings from "./components/modals/ChartSettings";
import TPOsSettings from "./components/modals/TPOsSettings";
import { ClockIcon, Menu, MousePointer2, Pencil, Settings  } from "lucide-react";
import SVPSettings from "./components/modals/SVPSettings";
import axios from "axios";
import FootprintSettings from "./components/modals/FootprintSettings";
import FootprintAllert from "./components/modals/FootprintAllert";


function App() {
  const [isProMode, setIsProMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState([]);
  const [offlineSymbol, setOfflineSymbol] = useState("");

  const [assetsList, setAssetsList] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [showIndicators, setShowIndicators] = useState(false);
  const [indicators, setIndicators] = useState([]);

  const [tpoSettingsOpen, setTpoSettingsOpen] = useState(false);
  const [svpSettingsOpen, setSvpSettingsOpen] = useState(false);
  const [fpSettingsOpen, setFpSettingsOpen] = useState(false);
  const [fpAllertOpen, setFpAllertOpen] = useState(false);

  const [showChartSettings, setShowChartSettings] = useState(false);
  const [chartConfig, setChartConfig] = useState({
      backgroundColor: "#131414", /*"#161616",*/ /*"#131419",*/ 
      textColor: "#DCEDE3",
      gridColor: "#303030",
      gridVertVisible: false,
      gridHorzVisible: false,
      candleUpColor: "#74A6E2", 
      candleDownColor: "#AA3A37", 
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
        return [...prev, { id: "volume" , upColor: "#74A6E2", downColor: "#AA3A37" }];
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
            blockWidth: 6,
            showCounts: true,
            showLines: true,
            expand: false,
            showNakedPOC: false,
            colorSingles: "#ff99eb", 
          }];
      }

       if (indicatorId === "svp") {
          if (prev.find(ind => ind.id === "svp")) return prev;
          return [...prev, { 
            id: "svp", 
            colorNormal: "#5c5c5c",
            colorVA: "#bababa", 
            colorPOC: "#e91c30", 
            rowSize: 20,
            width: 100,
            xOffset: 0
          }];
      }


      if (indicatorId === "footprint") {
        if (isOffline) {
          setFpAllertOpen(true); // Reusing the same alert, or make a specific string
          return prev; 
        }
        if (!isProMode) {
          setFpAllertOpen(true);
          return prev;
        }
        if (prev.find(ind => ind.id === "footprint")) return prev;
        return [...prev, { 
          id: "footprint", 
          colorText: '#FFFFFF', 
          rowSize: 10,
        }];
      }
      
      const newIndicator = {
        id: indicatorId,
        visible: true,
      };

      //return [...prev, { id: indicatorId }];
      return [...prev, newIndicator];
    });
  };

  // TPO Save Handler
  const saveTPOSettings = (updatedIndicator) => {
      setIndicators(prev => prev.map(i => 
          i.id === "tpo" ? { ...i, ...updatedIndicator } : i
      ));
      setTpoSettingsOpen(false);
  };

  const saveSVPSettings = (updatedIndicator) => {
      setIndicators(prev => prev.map(i => 
          i.id === "svp" ? { ...i, ...updatedIndicator } : i
      ));
      setSvpSettingsOpen(false);
  };

  const saveFpSettings = (updatedIndicator) => {
      setIndicators(prev => prev.map(i => 
          i.id === "footprint" ? { ...i, ...updatedIndicator } : i
      ));
      setFpSettingsOpen(false);
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

  const handleOfflineLoad = (data, fileName) => {
      setOfflineData(data);
      setOfflineSymbol(fileName);
      setIsOffline(true);
  };

  const handleExitOffline = () => {
      setIsOffline(false);
      setOfflineData([]);
      // Optionally reset asset or keep current
  };

  // --- Toggle Pro Mode (Start/Stop Ingestor) ---
  const handleToggleProMode = async () => {
    const newMode = !isProMode;
    setIsProMode(newMode);

    try {
      if (newMode) {
        await axios.post("http://localhost:8000/ingest/start");
        console.log("Pro Mode: Ingestor Started");
      }
      else {
        await axios.post("http://localhost:8000/ingest/stop");
        console.log("Pro Mode: Ingestor Stopped");
      }
    }
    catch (err) {
      console.error("Failed to toggle Orderflow Engine:", err);
    }
  };

  const handleToggleClock = () => {
    setChartConfig(prev => ({
      ...prev,
      showClock: !prev.showClock
    }));
  };

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

      {svpSettingsOpen && (
          <SVPSettings
            open={svpSettingsOpen}
            onClose={() => setSvpSettingsOpen(false)}
            initial={indicators.find(i => i.id === "svp")}
            onSave={saveSVPSettings}
          />
      )}

      {fpSettingsOpen && (
        <FootprintSettings
          open={fpSettingsOpen}
          onClose={() => setFpSettingsOpen(false)}
          initial={indicators.find(i => i.id === "footprint")}
          onSave={saveFpSettings}
        />
      )}

      {fpAllertOpen && (
        <FootprintAllert
          open={fpAllertOpen}
          onClose={() => setFpAllertOpen(false)}
        />
      )}

      <TopBar
        assets={assetsList}
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        timeframe={timeframe}
        onSelectTimeframe={setTimeframe}
        onOpenIndicators={() => setShowIndicators(true)}
        //offline props
        isOffline={isOffline}
        onImportData={handleOfflineLoad}
        onExitOffline={handleExitOffline}
      />

      {/* Main content */}
      {/*</div><div className="flex-1 overflow-hidden"> */}
      <div className="flex-1 overflow-hidden flex flex-row"> 

        {/* LEFT SIDEBAR */}
        <div className="flex-shrink-0 w-16 bg-(--gray) flex flex-col p-2 border-r-4 border-(--graphite) items-center">
        </div>
        
        {/* Chart */}
        <div className="flex-1 min-w-0">
        <PanelGroup direction="horizontal">
        <Panel minSize={20}>
        {/*<div className="flex-1 min-w-0">*/}
         <div className="w-full h-full">
          <Chart 
            isProMode={isProMode}
            selectedAsset={selectedAsset} 
            timeframe={timeframe} 
            panelOpen={isPanelOpen}
            indicators={indicators} 
            onOpenTPOSettings={() => setTpoSettingsOpen(true)} 
            onOpenSVPSettings={() => setSvpSettingsOpen(true)} 
            onOpenFpSettings={() => setFpSettingsOpen(true)} 
            onIndicatorsChange={setIndicators}
            chartSettings={chartConfig}
            //offline props
            isOffline={isOffline}
            offlineData={offlineData}
            offlineSymbol={offlineSymbol}/>
        </div>
        </Panel>

        {isPanelOpen && (
          <>
          <PanelResizeHandle className="w-1 bg-(--red)" />
          <Panel minSize={10} defaultSize={20}>
            <div className="w-full h-full border-l-2 border-(--graphite)">
              <p className="p-2 text-(--red)">Panel A content</p>
            </div>
          </Panel>
          </>
        )}

      {/* Right sidebar */}
      <div className="flex-shrink-0 w-16 bg-(--gray) flex flex-col p-2 border-l-4 border-(--graphite)">
        <button className="mb-2 px-2 py-2 flex items-center justify-center cursor-pointer hover:opacity-70"
        title="Open List"
        onClick={() => setIsPanelOpen(p => !p)}>
          <Menu className="w-6 h-6"/>
        </button>
        <div className="w-full h-px bg-(--graphite) my-1"></div>
        <button className="mb-2 px-2 py-2 flex items-center justify-center cursor-pointer hover:opacity-70"
        title="Settings"
        onClick={() => setShowChartSettings(true)}>
          <Settings className="w-6 h-6"/>
        </button>
        <div className="w-full h-px bg-(--graphite) my-1"></div>
        <button className="mb-2 px-2 py-2 flex items-center justify-center cursor-pointer hover:opacity-70"
        title="Toggle Clock"
        onClick={handleToggleClock}>
          <ClockIcon className="w-6 h-6"/>
        </button>
        <div className="w-full h-px bg-(--graphite) my-1"></div>
      </div>
      </PanelGroup>
    </div>
    </div>

    <BottomBar
    isOffline={isOffline}
    isProMode={isProMode}      
    onToggleProMode={handleToggleProMode}
    />

  </div>
  );
}

export default App;
