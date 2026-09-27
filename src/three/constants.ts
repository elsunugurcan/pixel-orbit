import { R, CELLS } from "../game/grid";
import { SHIELD_RADIUS } from "../game/rules";
export { R, CELLS };
/** Kalkan açısal yarıçapının yüzeydeki karşılığı (dünya birimi). */
export const SHIELD_RADIUS_WORLD = Math.sin(SHIELD_RADIUS) * (R + 1.5) * 1.05;
