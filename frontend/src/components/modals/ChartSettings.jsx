import React, { useState, useEffect } from "react";
import Modal from "./Modal";

const DEFAULTS = {
    backgroundColor: "#1e1e1e",
    textColor: "#DCEDE3",
    gridColor: "#535151",
    candleUp: "#26a69a",
    candleDown: "#ef5350"
};

const ChartSettings = ({ open, onClose, currentSettings, onSave }) => {

    const [localSettings, setLocalSettings] = useState(currentSettings);
    
    useEffect(() => {
        setLocalSettings(currentSettings);
    }, [currentSettings]);

    const handleChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const resetBackground = () => {
        handleChange("backgroundColor", DEFAULTS.backgroundColor);
        handleChange("textColor", DEFAULTS.textColor);
    };

    const resetCandles= () => {
        handleChange("candleUpColor", DEFAULTS.candleUp);
        handleChange("candleDownColor", DEFAULTS.candleDown);
    };

    return (
        <Modal open={open} onClose={onClose} title="Chart Settings">
            <div className="flex flex-col gap-4 px-4">

                {/* Section: Appearance */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-(--red) text-sm font-bold border-b border-(--red) pb-1">Appearence</h3>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Text Color</label>
                        <input type="color" value={localSettings.textColor} 
                               onChange={e => handleChange("textColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Background</label>
                        <input type="color" value={localSettings.backgroundColor} 
                               onChange={e => handleChange("backgroundColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                    <div className="flex justify-end items-center">
                        <button onClick={resetBackground} className="px-3 py-0.5 rounded-sm bg-gray-700 text-white cursor-pointer">Default</button>
                    </div>
                </div>
                 <div className="flex flex-col gap-2">
                    <h3 className="text-(--red) text-sm font-bold border-b border-(--red) pb-1">Grid</h3>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Grid Color</label>
                        <input type="color" value={localSettings.gridColor} 
                               onChange={e => handleChange("gridColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Show Grid Horizontal</label>
                        <input type="checkbox" checked={localSettings.gridHorzVisible} 
                               onChange={e => handleChange("gridHorzVisible", e.target.checked)} />
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Show Grid Vertical</label>
                        <input type="checkbox" checked={localSettings.gridVertVisible} 
                               onChange={e => handleChange("gridVertVisible", e.target.checked)} />
                    </div>
                </div>

                {/* Section: Candles */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-(--red) text-sm font-bold border-b border-(--red) pb-1">Candles</h3>
                    
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Up Color</label>
                        <input type="color" value={localSettings.candleUpColor} 
                               onChange={e => handleChange("candleUpColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>

                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Down Color</label>
                        <input type="color" value={localSettings.candleDownColor} 
                               onChange={e => handleChange("candleDownColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                    <div className="flex justify-end items-center">
                        <button onClick={resetCandles} className="px-3 py-0.5 rounded-sm bg-gray-700 text-white cursor-pointer">Default</button>
                    </div>
                </div>

                {/* Section: Tools */}
                 <div className="flex flex-col gap-2">
                    <h3 className="text-(--red) text-md font-bold border-b border-(--red) pb-1">Tools</h3>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Magnet Mode</label>
                        <input type="checkbox" checked={localSettings.magnetMode} 
                               onChange={e => handleChange("magnetMode", e.target.checked)} />
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Show Clock</label>
                        <input 
                            type="checkbox" 
                            checked={localSettings.showClock || false} 
                            onChange={e => handleChange("showClock", e.target.checked)} 
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300 text-sm">Clock Color</label>
                        <input type="color" value={localSettings.clockColor} 
                               onChange={e => handleChange("clockColor", e.target.value)} 
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button onClick={handleSave} className="px-4 py-0.5 bg-(--red) text-white rounded-sm hover:opacity-80">
                        Apply
                    </button>
                </div>
            
            </div>
        </Modal>
    );
};

export default ChartSettings;