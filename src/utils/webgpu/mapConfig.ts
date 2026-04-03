export interface MapConfig {
  name: string;
  scale: number;
  originX: number;
  originY: number;
}

export const MapRegistry: Record<string, MapConfig> = {
  "de_nuke": {
    name: "de_nuke",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_mirage": {
    name: "de_mirage",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_dust2": {
    name: "de_dust2",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_anubis": {
    name: "de_anubis",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_overpass": {
    name: "de_overpass",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_inferno": {
    name: "de_inferno",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
  "de_ancient": {
    name: "de_ancient",
    scale: 7.179,
    originX: -3451.4,
    originY: 2884.5,
  },
}

export const DefaultMapConfig: MapConfig = MapRegistry["de_nuke"];