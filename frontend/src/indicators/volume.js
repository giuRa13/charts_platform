
export function prepareVolumeData(candles) {
  // candles: [{ time, open, high, low, close, volume }]
  return candles.map(c => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? "#089981" : "#F23645" // green/red like Binance
  }));
}

export function updateLastVolume(volumeSeries, candles) {
  if (!candles.length) return;

  const last = candles[candles.length - 1];

  volumeSeries.update({
    time: last.time,
    value: last.volume,
    color: last.close >= last.open ? "#089981" : "#F23645"
  });
}