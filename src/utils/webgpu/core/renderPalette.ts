import type { Team } from "../types";

const CT_COLOR: [number, number, number] = [0.2, 0.6, 1.0];
const T_COLOR: [number, number, number] = [1.0, 0.4, 0.2];
const DIM_COLOR: [number, number, number] = [0.2, 0.2, 0.2];

export function getTeamColor(team: Team, isSecondHalf: boolean): [number, number, number] {
  const isCT = isSecondHalf ? team === 2 : team === 3;
  return isCT ? CT_COLOR : T_COLOR;
}

export function getPlayerColor(team: Team, alive: boolean, isSecondHalf: boolean): [number, number, number] {
  return alive ? getTeamColor(team, isSecondHalf) : DIM_COLOR;
}

export function getGrenadeColor(grenadeType: number): [number, number, number] {
  switch (grenadeType) {
    case 1:
      return [0.95, 0.35, 0.25];
    case 2:
      return [0.55, 0.55, 0.58];
    case 3:
      return [0.98, 0.92, 0.42];
    case 4:
      return [0.4, 0.85, 0.95];
    case 5:
      return [1.0, 0.55, 0.15];
    default:
      return [0.9, 0.9, 0.9];
  }
}
