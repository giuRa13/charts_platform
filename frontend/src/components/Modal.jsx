import React from 'react';
import { X } from 'lucide-react';

const Modal = ({open, onClose, title, children}) => {

    if (!open) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50'>
        <div className='bg-(--b) p-4 w-[380px] shadow-xl border border-(--red) relative'>
            {/*Heder*/}
            <div className='flex justify-between items-center mb-3'>
                <h2 className='text-lg font-semibold text-(--red)'>{title}</h2>
                <button onClick={onClose} className='p-1 hover:bg-white/10'>
                    <X className='w-5 h-5 text-(--red)'/>
                </button>
            </div>
            {/*Content*/}
            <div className='ma-h-[400px] overflow-y-auto pr-1'>
                {children}
            </div>
        </div>
    </div>
  )
};

export default Modal;