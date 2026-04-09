export function lerpAngleDeg(aDeg: number, bDeg: number, t: number): number {
  const a = wrapDeg(aDeg);
  const b = wrapDeg(bDeg);

  let delta = b - a;
  if (delta > 180) delta -= 360;
  else if (delta < -180) delta += 360;

  return wrapDeg(a + delta * t);
}

export function wrapDeg(d: number): number {
  let x = d;
  x = ((x % 360) + 360) % 360;
  if (x >= 180) x -= 360;
  return x;
}

export function lowerBoundWeaponFire<T extends { t: number; }>(arr: T[], tick: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t < tick) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function uniqueSortedTicks(ticks: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const tick of ticks) {
    if (!Number.isFinite(tick) || seen.has(tick)) continue;
    seen.add(tick);
    out.push(tick);
  }
  out.sort((a, b) => a - b);
  return out;
}

export function tracerLengthForWeapon(weapon: string): number {
  if (weapon.includes("awp") || weapon.includes("ssg08")) return 1800;
  if (weapon.includes("ak47") || weapon.includes("m4")) return 1400;
  if (weapon.includes("deagle")) return 1100;
  if (weapon.includes("usp") || weapon.includes("glock") || weapon.includes("p250")) return 900;
  if (weapon.includes("knife")) return 150;
  return 1200;
}
