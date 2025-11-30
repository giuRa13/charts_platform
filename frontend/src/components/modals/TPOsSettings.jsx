import React, { useState, useMemo } from 'react';
import Modal from './Modal';

const TPOsSettings = ({ open, onClose, initial, onSave }) => {

    const safeInitial = useMemo(() => initial || { 
        id: "tpo", 
        colorNormal: "#00378f",
        colorVA: "#bababa", 
        colorPOC: "#db8d1f",    
        colorText:"#B2B5BE",
        blockSize: 50,
        blockWidth: 6,
        showCounts: true,
        showLines: true,
        expand: false,
        showNakedPOC: false,
    }, [initial]);

    const [colorNormal, setColorNormal] = useState(safeInitial.colorNormal || "#00378f");
    const [colorVA, setColorVA] = useState(safeInitial.colorVA || "#bababa");
    const [colorPOC, setColorPOC] = useState(safeInitial.colorPOC || "#db8d1f");
    const [blockSize, setBlockSize] = useState(safeInitial.blockSize);
    const [blockWidth, setBlockWidth] = useState(safeInitial.blockWidth);
    const [colorText, setColorText] = useState(safeInitial.colorPOC || "#B2B5BE");
    const [showCounts, setShowCounts] = useState(safeInitial.showCounts !== false);
    const [showLines, setShowLines] = useState(safeInitial.showLines !== false);
    const [expand, setExpand] = useState(safeInitial.expand || false);
    const [showNakedPOC, setShowNakedPOC] = useState(safeInitial.showNakedPOC || false);

    React.useEffect(() => {
        setColorNormal(safeInitial.colorNormal || "#00378f");
        setColorVA(safeInitial.colorVA || "#bababa");
        setColorPOC(safeInitial.colorPOC || "#db8d1f");
        setBlockSize(safeInitial.blockSize || 50);
        setBlockWidth(safeInitial.blockWidth || 6);
        setColorText(safeInitial.colorText || "#B2B5BE");
        setShowCounts(safeInitial.showCounts !== false);
        setShowLines(safeInitial.showLines !== false);
        setExpand(safeInitial.expand || false);
        setShowNakedPOC(safeInitial.showNakedPOC || false);
    }, [safeInitial]);

    const handleSave = () => {
        onSave({ 
            ...safeInitial, 
            colorNormal, 
            colorVA, 
            colorPOC,
            colorText,
            blockSize: Number(blockSize),
            blockWidth: Number(blockWidth),
            showCounts,
            showLines,
            expand,
            showNakedPOC
        });
        onClose();
    };

    const defaultColors = () => {
        setColorNormal("#00378f");
        setColorVA("#bababa");
        setColorPOC("#db8d1f");
    };

    return (
        <Modal open={open} onClose={onClose} title="TPO Settings">
            <div className='flex flex-col gap-4 px-4'>
                
                {/* Block Size (Tick Size) */}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Block Size (Ticks)</label>
                    <input
                        type='number'
                        min={1}
                        value={blockSize}
                        onChange={(e) => setBlockSize(e.target.value)}
                        className='w-20 bg-[#161616] text-white px-2 py-1 border border-(--primary) outline-none text-right'
                    />
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Block Width (Pixels)</label>
                    <input
                        type='number'
                        min={1}
                        value={blockWidth}
                        onChange={(e) => setBlockWidth(e.target.value)}
                        className='w-20 bg-[#161616] text-white px-2 py-1 border border-(--primary) outline-none text-right'
                    />
                </div>

                {/*Split*/}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Split</label>
                    <input type="checkbox" 
                        checked={expand} 
                        onChange={(e) => setExpand(e.target.checked)} />
                </div>

                {/*Naked POC*/}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Naked POC</label>
                    <input type="checkbox" 
                        checked={showNakedPOC} 
                        onChange={(e) => setShowNakedPOC(e.target.checked)} />
                </div>

                {/* Color */}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>POC Color</label>
                    <input type='color'
                        value={colorPOC} // Ensure hex
                        onChange={(e) => setColorPOC(e.target.value)}
                        className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'
                    />
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Value Area (70%)</label>
                    <input type='color' 
                        value={colorVA} onChange={(e) => setColorVA(e.target.value)} 
                        className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Normal Color</label>
                    <input type='color' 
                        value={colorNormal} 
                        onChange={(e) => setColorNormal(e.target.value)} 
                        className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Text Color</label>
                    <input type='color' 
                        value={colorText} 
                        onChange={(e) => setColorText(e.target.value)} 
                        className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'/>
                </div>

                {/* Show Lines */}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Show Levels (POC/VA)</label>
                    <input type="checkbox" 
                        checked={showLines} 
                        onChange={(e) => setShowLines(e.target.checked)} />
                </div>

                {/* Show Counts */}
                <div className='flex items-center justify-between'>
                    <label className='text-sm'>Show Counts</label>
                    <input 
                        type="checkbox" 
                        checked={showCounts} 
                        onChange={(e) => setShowCounts(e.target.checked)} 
                    />
                </div>

                <div className='flex items-center justify-end'>
                    <button onClick={() => defaultColors()}
                    className='w-[50%] items-center bg-(--primary) py-0.5 rounded-sm justify-end'>
                        Default Colors
                    </button>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-(--primary)">
                    <button onClick={onClose} className="py-1 px-4 bg-(--red) rounded-sm hover:opacity-80 text-sm">Cancel</button>
                    <button onClick={handleSave} className="py-1 px-4 bg-(--primary) rounded-sm hover:opacity-80 text-sm">Save</button>
                </div>
            
            </div>
        </Modal>
    );
};

export default TPOsSettings;
