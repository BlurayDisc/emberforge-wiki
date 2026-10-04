import { t } from '../i18n/ui';

export function formatPercent(fraction: number): string {
  const percent = fraction * 100;
  if (percent > 0 && percent < 0.1) return `${Number(percent.toPrecision(2))}%`;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1).replace(/\.0$/, '')}%`;
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : String(Math.round(value * 100) / 100);
}

export function formatQuantityRange(minimum: number, maximum: number): string {
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
}

export function formatSignedValueRange(minimum: number, maximum: number): string {
  return `+${formatQuantityRange(minimum, maximum)}`;
}

export function formatMoney(copper: number, copperPerSilver = 100, silverPerGold = 100): string {
  const gold = Math.floor(copper / (copperPerSilver * silverPerGold));
  const silver = Math.floor(copper / copperPerSilver) % silverPerGold;
  const remainingCopper = copper % copperPerSilver;
  const parts = [
    gold ? t('{amount}g', { amount: gold }) : '',
    silver ? t('{amount}s', { amount: silver }) : '',
    remainingCopper || copper === 0 ? t('{amount}c', { amount: remainingCopper }) : '',
  ];
  return parts.filter(Boolean).join(' ');
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return t('{seconds}s', { seconds: totalSeconds });
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? t('{minutes}m {seconds}s', { minutes, seconds }) : t('{minutes}m', { minutes });
}

export function slugFromId(id: string): string {
  return encodeURIComponent(id);
}
