import React from 'react';
import Modal from './Modal';

const FootprintAllert = ({ open, onClose }) => {

  return (
       <Modal open={open} onClose={onClose} title="Tick Data Required">
            <div className='flex flex-col gap-4 px-4 text-[#DCEDE3]'>
                <div className='flex items-center'>
                    <h2>Enable Tick Data for use Footprint Chart.</h2>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onClose} className="w-[50%] px-4 py-1 bg-[#2c99c0] text-white text-xs font-bold hover:opacity-80">Ok</button>
                </div>
            </div>
        </Modal>
  );
};

export default FootprintAllert;