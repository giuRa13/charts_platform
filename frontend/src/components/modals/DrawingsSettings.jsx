import React, { useState } from "react";
import Modal from "./Modal";
import { Trash2 } from "lucide-react";


const DrawingsSettings = ({ open, onClose, currentObject, onSave, onDelete }) => {

    const [settings, setSettings] = useState({ color: "#2962FF", lineWidth: 2 });
    
    React.useEffect(() => {
        if (currentObject) {
            setSettings({
                color: currentObject.color || "#2962FF",
                lineWidth: currentObject.lineWidth || 2
            });
        }
    }, [currentObject]);

    const handleSave = () => {
        onSave(settings);
        onClose();
    };

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title="Chart Settings">
            <div className="flex flex-col gap-4 px-4">

        
                    <div className="flex justify-between items-center">
                        <label className="text-(--red) text-sm">Color</label>
                        <input type="color" value={settings.color} 
                               onChange={(e) => setSettings({...settings, color: e.target.value})}
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)"/>
                    </div>
                

                <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-sm text-(--red)">Line Width</label>
                        <span className="text-sm mr-2 text-gray-400">{settings.lineWidth}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" max="10" 
                        value={settings.lineWidth}
                        onChange={(e) => setSettings({...settings, lineWidth: parseInt(e.target.value)})}
                        className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/*<div className="flex justify-end mt-4">
                    <button onClick={handleSave} className="px-4 py-0.5 bg-(--red) text-white rounded-sm hover:opacity-80">
                        Apply
                    </button>
                </div>*/}
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-700">
                    <button 
                        onClick={handleDelete}
                        className="flex items-center gap-1 px-3 py-1 text-red-400 hover:bg-red-900/20 rounded-sm transition-colors text-xs"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>

                    <button onClick={handleSave} className="px-4 py-1 bg-(--red) text-white rounded-sm hover:opacity-80 text-sm">
                        Apply
                    </button>
                </div>
            
            </div>
        </Modal>
    );
};

export default DrawingsSettings;