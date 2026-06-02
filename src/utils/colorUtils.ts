// RGB stops for the score gradient: red (0) → yellow (5) → teal (10)
const RED:    [number, number, number] = [239,  68,  68];  // #EF4444
const YELLOW: [number, number, number] = [245, 158,  11];  // #F59E0B
const GREEN:  [number, number, number] = [  0, 128,   0];  // #008000

function lerp(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + t * (b[0] - a[0])),
    Math.round(a[1] + t * (b[1] - a[1])),
    Math.round(a[2] + t * (b[2] - a[2])),
  ];
}

/**
 * Maps a numeric weather score [0–10] to a smooth red→yellow→teal gradient.
 * Returns an `rgb(r,g,b)` string usable as a React Native color.
 */
export function numericScoreGradientColor(score: number): string {
  const t = Math.max(0, Math.min(10, score)) / 10;
  const [r, g, b] =
    t <= 0.5
      ? lerp(RED, YELLOW, t / 0.5)
      : lerp(YELLOW, GREEN, (t - 0.5) / 0.5);
  return `rgb(${r},${g},${b})`;
}
