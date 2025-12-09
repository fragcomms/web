export type PlayerState = {
    id: number;
    x: number;
    y: number;
    alive: boolean;
    team: 0 | 1;
};

export type Frame = {
    time: number;
    players: PlayerState[];
};