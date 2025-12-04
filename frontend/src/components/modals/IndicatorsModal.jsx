import React from 'react';
import Modal from "./Modal";

const Indicators = [
    { id: "volume", label: "Volume", upColor: "#2c99c0", downColor: "#be292d" },
    { id: "ema", label: "EMA", length: 20, color: "#c8b914", lineWidth: 2 },
    { id: "cvd", label: "CVD" },
    { id: "svp", label: "Session Volume Profile", width: 100, rowSize: 20, xOffset: 0 },
    { id: "tpo", label: "TPO (Market Profile)", color: "rgba(41, 98, 255, 0.6)", blockSize: 10 },
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