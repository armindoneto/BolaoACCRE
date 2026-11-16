/** Converte pontos da configuração (ex.: 0.5) para décimos inteiros (5). */
export function toTenths(points: number): number {
  return Math.round(points * 10);
}

/** Formata décimos em pt-BR: 125 -> "12,5", 120 -> "12", -20 -> "−2". */
export function formatPoints(tenths: number): string {
  const negative = tenths < 0;
  const abs = Math.abs(tenths);
  const whole = Math.trunc(abs / 10);
  const frac = abs % 10;
  const text = frac === 0 ? `${whole}` : `${whole},${frac}`;
  return negative ? `−${text}` : text;
}

/** Como formatPoints, mas com sinal explícito: "+3", "−2", "+0,5". */
export function formatSigned(tenths: number): string {
  return tenths > 0 ? `+${formatPoints(tenths)}` : formatPoints(tenths);
}

/** "1 pt" / "12,5 pts". */
export function formatPts(tenths: number): string {
  return `${formatPoints(tenths)} ${Math.abs(tenths) === 10 ? "pt" : "pts"}`;
}
