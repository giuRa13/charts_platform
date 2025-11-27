import React from 'react';
import Modal from "./Modal";

const Indicators = [
    { id: "volume", label: "Volume", upColor: "#2c99c0", downColor: "#be292d" },
    { id: "ema", label: "EMA", length: 20, color: "#c8b914", lineWidth: 2 },
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
                className='w-full text-left px-3 py-2 bg-white/5 hover:bg-(--primary) text-(--text) hover:text-(--black)'
                >
                    {ind.label}
                </button>
            ))}
        </div>
    </Modal>
  )
};

export default IndicatorsModal;