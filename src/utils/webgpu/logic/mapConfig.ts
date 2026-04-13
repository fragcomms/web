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
  "de_inferno": {
    name: "de_inferno",
    scale: 4.993,
    originX: -2057.5,
    originY: 3880.2,
  },
  "de_mirage": {
    name: "de_mirage",
    scale: 5.087,
    originX: -3218.622,
    originY: 1679.804,
  },
  "de_dust2": {
    name: "de_dust2",
    scale: 4.507,
    originX: -2476.311,
    originY: 3223.003,
  },
  "de_anubis": {
    name: "de_anubis",
    scale: 5.273,
    originX: -2723.284,
    originY: 3359.132,
  },
  "de_overpass": {
    name: "de_overpass",
    scale: 5.276,
    originX: -4811.110,
    originY: 1760.432,
  },
  "de_ancient": {
    name: "de_ancient",
    scale: 5.176,
    originX: -2992.674,
    originY: 2179.090,
  },
};

export const DefaultMapConfig: MapConfig = MapRegistry["de_nuke"];