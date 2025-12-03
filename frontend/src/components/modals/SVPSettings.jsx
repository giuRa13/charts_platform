import React, { useState, useMemo } from 'react';
import Modal from './Modal';

const SVPSettings = ({ open, onClose, initial, onSave }) => {

    const safeInitial = useMemo(() => initial || {}, [initial]);

    const [rowSize, setRowSize] = useState(safeInitial.rowSize || 10);
    const [width, setWidth] = useState(safeInitial.width || 100);
    const [colorNormal, setColorNormal] = useState(safeInitial.colorNormal || "#5c5c5c");
    const [colorPOC, setColorPOC] = useState(safeInitial.colorPOC || "#e91c30");
    const [colorVA, setColorVA] = useState(safeInitial.colorVA || "#bababa");
    const [xOffset, setXOffset] = useState(safeInitial.xOffset || 0);
    const [showVALines, setShowVALines] = useState(safeInitial.showVALines || false);
    const [showNakedPOC, setShowNakedPOC] = useState(safeInitial.showNakedPOC || false);
    const [showCounts, setShowCounts] = useState(safeInitial.showCounts !== false);

    const handleSave = () => {
        onSave({ 
            ...safeInitial, 
            rowSize: Number(rowSize), 
            width: Number(width),
            xOffset: Number(xOffset),
            colorVA,
            colorNormal,
            colorPOC,
            showVALines,
            showNakedPOC,
            showCounts,
        });
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title={"Volume Profile Settings"}>
            <div className='flex flex-col gap-4 px-4 text-[#DCEDE3]'>
                <div className='flex justify-between'>
                    <label className='text-sm'>Row Size</label>
                    <input onChange={e=>setRowSize(e.target.value)}
                    type='number' 
                    step="0.1" // Allow decimals (e.g. 0.5 or 0.1)
                    min="0.00001"
                    value={rowSize}  
                    className='w-20 bg-[#161616] text-white px-2 py-1 border border-(--primary) outline-none text-right'/>
                </div>
                <div className='flex justify-between'>
                    <label className='text-sm'>Width (px)</label>
                    <input onChange={e=>setWidth(e.target.value)}
                    type='number' 
                    value={width}  
                    className='w-20 bg-[#161616] text-white px-2 py-1 border border-(--primary) outline-none text-right'/>
                </div>
                <div className='border-t border-gray-700'></div>
                
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>POC Color</label>
                    <input type='color' value={colorPOC} onChange={e=>setColorPOC(e.target.value)} 
                    className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>Value Area</label>
                    {/* Using text input to allow RGBA/Transparency */}
                    <input type='color' value={colorVA} onChange={e=>setColorVA(e.target.value)} 
                    className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>
                <div className='flex justify-between items-center'>
                    <label className='text-sm'>Normal</label>
                    <input type='color' value={colorNormal} onChange={e=>setColorNormal(e.target.value)} 
                    className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>

                <div className='flex items-center justify-between'>
                    <label className='text-sm'>X Offset (px)</label>
                    <input type="number" 
                        value={xOffset} 
                        step="1" // Allow decimals (e.g. 0.5 or 0.1)
                        min="-200"
                        onChange={e=>setXOffset(e.target.value)} 
                        className='w-20 bg-[#161616] text-white px-2 py-1 border border-(--primary) outline-none text-right'/>
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Show VAH / VAL</label>
                    <input type="checkbox" 
                        checked={showVALines} 
                        onChange={(e) => setShowVALines(e.target.checked)} />
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Naked POC</label>
                    <input type="checkbox" 
                        checked={showNakedPOC} 
                        onChange={(e) => setShowNakedPOC(e.target.checked)} />
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Show Counts</label>
                    <input type="checkbox" 
                        checked={showCounts} 
                        onChange={(e) => setShowCounts(e.target.checked)} />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleSave} className="px-4 py-1 bg-(--primary) text-white rounded-sm text-xs font-bold hover:opacity-80">Save</button>
                </div>
            </div>
        </Modal>
    );

};

export default SVPSettings;