
export function prepareEMA(candles, length = 20) {
  if (!Array.isArray(candles) || candles.length === 0) return [];

  const k = 2 / (length + 1);
  let ema = null;

  return candles.map((c) => {
    if (ema === null) ema = c.close;
    // EMA = (Prezzo di Chiusura di Oggi × Moltiplicatore) + (EMA Precedente × (1 - Moltiplicatore))
    else ema = c.close * k + ema * (1 - k);
    return { time: c.time, value: ema };
  });
}

export function updateLastEMA(series, candles, length = 20) {
  if (!series || !Array.isArray(candles) || candles.length === 0) return;

  const emaData = prepareEMA(candles, length);
  const last = emaData[emaData.length - 1];
  
  if (last) series.update(last);
}