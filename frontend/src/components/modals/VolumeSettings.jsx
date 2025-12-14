import React, { useState } from 'react';
import Modal from './Modal';

const VolumeSettings = ({ 
    open, 
    onClose, 
    initial,
    onSave 
}) => {

    const defaultUp = "#74A6E2";
    const defaultDown = "#AA3A37";
    const [upColor, setUpColor] = useState(initial.upColor || defaultUp);
    const [downColor, setDownColor] = useState(initial.downColor || defaultDown);

    React.useEffect(() => {
        setUpColor(initial.upColor || defaultUp);
        setDownColor(initial.downColor || defaultDown);
    }, [initial]);

    const resetDefaults = () => {
        setUpColor(defaultUp);
        setDownColor(defaultDown);
    };

    const handleSave = () => {
        onSave({ upColor, downColor });
        onClose();
    };

    return (
    <Modal open={open} onClose={onClose} title="Volume Settings">
      <div className="flex flex-col gap-2 px-4">

        <div className='flex items-center justify-between'>
            <label className='text-md'>Up Color</label>
            <input
                type='color'
                value={upColor}
                onChange={(e) => setUpColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'
            />
        </div>
 
        <div className='flex items-center justify-between'>
            <label className='text-md'>Down Color</label>
            <input
                type='color'
                value={downColor}
                onChange={(e) => setDownColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--graphite) hover:border-(--primary)'
            />
        </div>

        <div className="flex justify-between gap-2 mt-4">
            <button onClick={resetDefaults} className="px-3 py-0.5 w-full bg-(--primary) hover:opacity-80 cursor-pointer">Default</button>
          <button onClick={handleSave} className="px-3 py-0.5 w-full bg-(--primary) hover:opacity-80 cursor-pointer">Save</button>
        </div>

      </div>
    </Modal>
  )
};

export default VolumeSettings;