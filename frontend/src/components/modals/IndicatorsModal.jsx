import React from 'react';
import Modal from "./Modal";

const Indicators = [
    { id: "volume", label: "Volume", upColor: "#26a69a", downColor: "#ef5350" },
    { id: "ema", label: "EMA", length: 20, color: "#f1c40f", lineWidth: 2 },
    { id: "cvd", label: "CVD" },
    { id: "rsi", label: "RSI" },
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