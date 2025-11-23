import React from 'react';
import { X } from 'lucide-react';

const Modal = ({open, onClose, title, children}) => {

    if (!open) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-45'>
        <div className='bg-(--b) w-[380px] shadow-xl border border-(--red) relative'>
            {/*Heder*/}
            <div className='flex justify-between items-center mb-3 bg-(--red)'>
                <h2 className='text-lg font-semibold text-(--b) ml-2'>{title}</h2>
                <button onClick={onClose} className='p-1 hover:bg-white/10'>
                    <X className='w-5 h-5 text-(--b)'/>
                </button>
            </div>
            {/*Content*/}
            <div className='ma-h-[400px] overflow-y-auto p-4'>
                {children}
            </div>
        </div>
    </div>
  )
};

export default Modal;