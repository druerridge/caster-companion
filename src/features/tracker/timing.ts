/** How long the coin-flip result stays on screen before the game starts. */
export const COIN_REVEAL_MS = 1500;

/** The change indicator stays fully visible this long after each change... */
export const CHANGE_HOLD_MS = 500;
/** ...then fades out over this long, so players can see the burst running out. */
export const CHANGE_FADE_MS = 1000;
/** Taps closer together than this count as one burst for the change indicator. */
export const CHANGE_BURST_MS = CHANGE_HOLD_MS + CHANGE_FADE_MS;
