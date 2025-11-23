import React, { useState } from 'react';
import Modal from './Modal';

const VolumeSettings = ({ 
    open, 
    onClose, 
    initial,
    onSave 
}) => {

    const defaultUp = "#26a69a";
    const defaultDown = "#ef5350";
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
            <label className='text-(--red) text-md'>Up Color</label>
            <input
                type='color'
                value={upColor}
                onChange={(e) => setUpColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)'
            />
        </div>
 
        <div className='flex items-center justify-between'>
            <label className='text-(--red) text-md'>Down Color</label>
            <input
                type='color'
                value={downColor}
                onChange={(e) => setDownColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded-md border-4 border-(--gray) hover:border-(--red)'
            />
        </div>

        <div className="flex justify-end mt-2">
            <button onClick={resetDefaults} className="px-3 py-0.5 rounded-sm bg-gray-700 text-white cursor-pointer">Default</button>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSave} className="px-3 py-0.5 rounded-sm bg-(--red) w-[50%] text-white cursor-pointer">Save</button>
        </div>

      </div>
    </Modal>
  )
};

export default VolumeSettings;