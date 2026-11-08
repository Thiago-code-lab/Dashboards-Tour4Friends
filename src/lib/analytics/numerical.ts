export function finiteValues(values: number[]): void {
  if (values.some((value) => !Number.isFinite(value)))
    throw new Error('Valores não finitos recusados.');
}

export function quantile(values: number[], probability: number): number | null {
  finiteValues(values);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1)
    throw new Error('Quantil inválido.');
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

export function describe(values: number[]) {
  finiteValues(values);
  const n = values.length;
  const average = n ? values.reduce((sum, value) => sum + value, 0) / n : null;
  return {
    n,
    mean: average,
    median: quantile(values, 0.5),
    q1: quantile(values, 0.25),
    q3: quantile(values, 0.75),
    min: n ? Math.min(...values) : null,
    max: n ? Math.max(...values) : null,
    sd:
      n > 1
        ? Math.sqrt(values.reduce((sum, value) => sum + (value - average!) ** 2, 0) / (n - 1))
        : null,
  };
}

/** A content identifier, not a security hash. Both 32-bit lanes include every UTF-16 code unit. */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let left = 2166136261;
  let right = 3335557771;
  for (let i = 0; i < text.length; i++) {
    left = Math.imul(left ^ text.charCodeAt(i), 16777619);
    right = Math.imul(right ^ text.charCodeAt(i), 2246822519);
  }
  return `${(left >>> 0).toString(16).padStart(8, '0')}${(right >>> 0).toString(16).padStart(8, '0')}-${text.length}`;
}

export function wilson(successes: number, n: number): { lower: number; upper: number } | null {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(successes) ||
    n < 0 ||
    successes < 0 ||
    successes > n
  )
    throw new Error('Contagem binomial inválida.');
  if (!n) return null;
  const z = 1.959963984540054;
  const p = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return {
    lower: successes === 0 ? 0 : Math.max(0, center - half),
    upper: successes === n ? 1 : Math.min(1, center + half),
  };
}

/** Modified MAD score; zero-spread references are explicitly not classifiable. */
export function robustDeviation(value: number, peers: number[], minimum = 6) {
  finiteValues([value, ...peers]);
  const center = quantile(peers, 0.5);
  if (peers.length < minimum || center === null) return null;
  const mad = quantile(
    peers.map((point) => Math.abs(point - center)),
    0.5,
  )!;
  const iqr = quantile(peers, 0.75)! - quantile(peers, 0.25)!;
  const scale = mad > 1e-9 ? mad / 0.67448975 : iqr > 1e-9 ? iqr / 1.3489795 : null;
  return scale === null
    ? null
    : {
        reference: center,
        score: (value - center) / scale,
        sample: peers.length,
        method: mad > 1e-9 ? 'MAD modificado' : 'IQR robusto',
      };
}
