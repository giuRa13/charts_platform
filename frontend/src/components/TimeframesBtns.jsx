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
                className={`px-3 py-0 border-3 border-(--graphite) cursor-pointer rounded-sm
                    ${timeframe === tf.value ? "bg-(--primaryT) text-(--text) border-(--primary)" : "bg-transparent text-(--text)"}
                    hover:bg-(--primary)/40`}
                >
                {tf.label}
                </button>
            ))}
        </div>
    );
};

export default TimeframeBtns;