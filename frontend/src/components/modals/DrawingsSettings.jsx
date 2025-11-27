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
        <Modal open={open} onClose={onClose} title="Drawing Settings">
            <div className="flex flex-col gap-4 px-4">

        
                    <div className="flex justify-between items-center">
                        <label className="text-(--text) text-sm">Color</label>
                        <input type="color" value={settings.color} 
                               onChange={(e) => setSettings({...settings, color: e.target.value})}
                               className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)"/>
                    </div>
                

                <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-sm text-(--text)">Line Width</label>
                        <span className="text-sm mr-2 text-gray-400">{settings.lineWidth}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" max="10" 
                        value={settings.lineWidth}
                        onChange={(e) => setSettings({...settings, lineWidth: parseInt(e.target.value)})}
                        className="w-full h-1 bg-(--primary) rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex justify-between gap-4 items-center mt-4 pt-2 border-t border-gray-700">
                    <button 
                        onClick={handleDelete}
                        className="flex items-center justify-center py-1 w-full bg-(--red) rounded-sm hover:opacity-80 text-sm"
                    >
                        <Trash2 size={14} className="mr-2"/>
                        Delete
                    </button>

                    <button onClick={handleSave} className="py-1 w-full bg-(--primary) rounded-sm hover:opacity-80 text-sm">
                        Apply
                    </button>
                </div>
            
            </div>
        </Modal>
    );
};

export default DrawingsSettings;