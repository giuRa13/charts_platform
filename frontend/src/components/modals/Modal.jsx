import React, { useRef } from 'react';
import { X } from 'lucide-react';
import useDraggable from '../../hooks/useDraggable';

const Modal = ({open, onClose, title, children}) => {

    const modalRef = useRef(null);
    const handleRef = useRef(null);
    useDraggable(handleRef, modalRef);

    if (!open) return null;


  return (
    <div className='fixed inset-0 flex z-50 items-center justify-center pointer-events-none'> {/*bg-black/60 backdrop-blur-sm */} 
        <div ref={modalRef} className='bg-(--gray) w-[380px] shadow-xl border border-(--graphite) relative pointer-events-auto'>
            {/*Heder*/}
            <div ref={handleRef} className='flex justify-between items-center mb-3 bg-(--black) select-none'> {/*select-none cursor-move*/}
                <h2 className='text-lg font-semibold text-(--text) ml-2'>{title}</h2>
                <button onClick={onClose} className='p-1 hover:bg-(--redT) hover:text-(--red)'>
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