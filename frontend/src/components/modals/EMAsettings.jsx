import React from 'react';
import Modal from './Modal';
import { useState } from 'react';

const EMAsettings = ({ 
    open, 
    onClose, 
    initial = { id: "ema", length: 20, color: "#f1c40f", lineWidth: 2 }, 
    onSave 
}) => {

    const safeInitial = React.useMemo(() => initial, [initial]);

    const [length, setLength] = useState(safeInitial.length || 20);
    const [color, setColor] = useState(safeInitial.color || "#ffcc00");
    const [lineWidth, setLineWidth] = React.useState(safeInitial.lineWidth || 2);

    React.useEffect(() => {
        setLength(safeInitial.length || 20);
        setColor(safeInitial.color || "#f1c40f");
        setLineWidth(safeInitial.lineWidth || 2);
    }, [safeInitial]);

    const handleSave = () => {
        const updated = { ...safeInitial, length: Number(length), color, lineWidth };
        if (onSave) onSave(updated);
        if (onClose) onClose();
    };

  return (
    <Modal open={open} onClose={onClose} title="EMA Settings">
        <div className='flex flex-col gap-2 px-4'>
            
            <div className='flex items-center justify-between'>
                <label className='text-(--red) text-md'>Length</label>
                <input
                    type='number'
                    min={1}
                    step={1}
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className='w-[25%] bg-(--gray) text-white px-2 py-1 border border-(--red) outline-none'
                />
            </div>

            <div className='flex items-center justify-between'>
                <label className='text-(--red) text-md'>Line Width</label>
                <input
                    type='number'
                    min={1}
                    step={1}
                    max={6}
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className='w-[25%] bg-(--gray) text-white px-2 py-1 border border-(--red) outline-none'
                />
            </div>

            <div className='flex items-center justify-between'>
                <label className='text-(--red) text-md'>Color</label>
                <input
                    type='color'
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)'
                />
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-3 py-1 bg-(--gray) hover:bg-white/10 cursor-pointer">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 bg-(--red) hover:opacity-80 cursor-pointer">Save</button>
            </div>
        
        </div>
    </Modal>
  )
};

export default EMAsettings;