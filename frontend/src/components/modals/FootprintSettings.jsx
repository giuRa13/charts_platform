import React, { useState, useMemo } from 'react';
import Modal from './Modal';

const FootprintSettings = ({ open, onClose, initial, onSave }) => {

    const safeInitial = useMemo(() => initial || {}, [initial]);

    // 0.5 means "Every 0.5 price movement is a row"
    // 1 means "Every 1.0 price movement is a row" (Aggregation)
    const [rowSize, setRowSize] = useState(safeInitial.rowSize || 0.5); 
    const [colorText, setColorText] = useState(safeInitial.colorText || "#FFFFFF");
    const [maxBars, setMaxBars] = useState(safeInitial.maxBars || 20); 
    const [showPOC, setShowPOC] = useState(safeInitial.showPOC !== false); 
    const [colorPOC, setColorPOC] = useState(safeInitial.colorPOC || "#FFFF00"); 
    const [alphaContrast, setAlphaContrast] = useState(safeInitial.alphaContrast || 10); 

    React.useEffect(() => {
        setRowSize(safeInitial.rowSize || 0.5);
        setColorText(safeInitial.colorText || "#FFFFFF");
        setMaxBars(safeInitial.maxBars || 20);
        setShowPOC(safeInitial.showPOC !== false);
        setColorPOC(safeInitial.colorPOC || "#FFFF00");
        setAlphaContrast(safeInitial.alphaContrast || 10);
    }, [safeInitial]);

    const handleSave = () => {
        onSave({ 
            ...safeInitial, 
            rowSize: Number(rowSize), 
            maxBars: Number(maxBars),
            colorText,
            showPOC,
            colorPOC,
            alphaContrast,
        });
        onClose();
    };

  return (
      <Modal open={open} onClose={onClose} title="Footprint Settings">
            <div className='flex flex-col gap-4 px-4 text-[#DCEDE3]'>
                <div className='flex justify-between'>
                    <label className='text-sm'>Row Size (Aggregation)</label>
                    <input 
                        type='number' 
                        step="0.1" 
                        min="0.00001"
                        value={rowSize} 
                        onChange={e=>setRowSize(e.target.value)} 
                        className='w-20 bg-[#161616] border border-(--graphite) py-1 text-right'
                    />
                </div>

                 <div className='flex justify-between'>
                    <label className='text-sm'>Max Active Bars</label>
                    <input 
                        type='number' 
                        min="1" 
                        max="100"
                        value={maxBars} 
                        onChange={e=>setMaxBars(e.target.value)} 
                        className='w-20 bg-[#161616] border border-(--graphite) py-1 text-right'
                    />
                </div>
                
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>Text Color</label>
                    <input type='color' 
                    value={colorText} 
                    onChange={e=>setColorText(e.target.value)} 
                    className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)"/>
                </div>

                <div className='border-t border-(--graphite) my-1'></div>

                {/* POC Settings */}
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>Show POC</label>
                    <input type="checkbox" checked={showPOC} onChange={e => setShowPOC(e.target.checked)} />
                </div>    
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>POC Color</label>
                    <input type='color' 
                    value={colorPOC} 
                    onChange={e=>setColorPOC(e.target.value)} 
                    className="h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)"/>
                </div>
                
                <div className='border-t border-(--graphite) my-1'></div>

                <div className='flex justify-between'>
                    <label className='text-sm'>Alpha Contrast</label>
                    <input 
                        type='number' 
                        step="0.5" 
                        min="0.0"
                        value={alphaContrast} 
                        onChange={e=>setAlphaContrast(e.target.value)} 
                        className='w-20 bg-[#161616] border border-(--graphite) p-1 text-right'
                    />
                </div>

                <div className='border-t border-(--graphite) my-1'></div>

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleSave} className="px-4 py-1 w-[50%] bg-(--primary) text-white text-xs font-bold hover:opacity-80">Save</button>
                </div>
            </div>
        </Modal>
  );
};

export default FootprintSettings;