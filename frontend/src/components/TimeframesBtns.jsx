const TimeframeBtns = ({ timeframe, onSelectTimeframe }) => {

    const times = [
        { label: "1m", value: "1m" },
        { label: "5m", value: "5m" },
        { label: "30m", value: "30m" },
        { label: "1D", value: "1d" },  // label differs but value correct
    ];

    return (
        <div className="flex space-x-2">
            {times.map(tf => (
                <button
                key={tf.value}
                onClick={() => onSelectTimeframe(tf.value)}
                className={`px-4 py-1 border border-(--red) cursor-pointer
                    ${timeframe === tf.value ? "bg-(--red) text-black" : "bg-(--gray) text-(--red)"}
                    hover:opacity-70`}
                >
                {tf.label}
                </button>
            ))}
        </div>
    );
};

export default TimeframeBtns;