
export function prepareVolumeData(candles, upColor = "#26a69a", downColor = "#ef5350") {
  return candles.map(c => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? upColor : downColor
  }));
}

export function updateLastVolume(volumeSeries, candles, upColor, downColor) {
  if (!candles.length) return;
  const last = candles[candles.length - 1];

  volumeSeries.update({
    time: last.time,
    value: last.volume,
    color: last.close >= last.open ? upColor : downColor
  });
}