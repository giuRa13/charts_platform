import React from 'react';
import Modal from "./Modal";

const Indicators = [
    { id: "volume", label: "Volume" },
    { id: "cvd", label: "CVD" },
    { id: "rsi", label: "RSI" },
    { id: "ema50", label: "EMA 50" },
    { id: "ema200", label: "EMA 200" },
];

const IndicatorsModal = ({ open, onClose, onSelect }) => {
  return (
    <Modal open={open} onClose={onClose} title="Add Indicator">
        <div className='flex flex-col gap-2'>
            {Indicators.map(ind => (
                <button key={ind.id}
                onClick={() => { onSelect(ind.id); onClose(); }}
                className='w-full text-left px-3 py-2 bg-white/5 hover:bg-(--red) text-(--red) hover:text-black'
                >
                    {ind.label}
                </button>
            ))}
        </div>
    </Modal>
  )
};

export default IndicatorsModal;