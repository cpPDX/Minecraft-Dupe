import { DAY_DURATION, TIME } from '../utils/constants.js';

export class TimeSystem {
  constructor(initialTime = 0.35) {
    // normalizedTime: 0.0 = midnight, 0.5 = noon
    this.normalizedTime = initialTime;
    this.paused = false;
  }

  update(delta) {
    if (this.paused) return;
    this.normalizedTime = (this.normalizedTime + delta / DAY_DURATION) % 1;
  }

  get isDay() {
    return this.normalizedTime >= TIME.DAY && this.normalizedTime < TIME.DUSK;
  }

  get isNight() {
    return this.normalizedTime >= TIME.NIGHT || this.normalizedTime < TIME.DAWN;
  }

  get isDawn() {
    return this.normalizedTime >= TIME.DAWN && this.normalizedTime < TIME.DAY;
  }

  get isDusk() {
    return this.normalizedTime >= TIME.DUSK && this.normalizedTime < TIME.NIGHT;
  }

  /** Ambient light 0–1 (for surface). */
  get ambientLight() {
    const t = this.normalizedTime;
    if (this.isDay)   return 1.0;
    if (this.isNight) return 0.12;

    if (this.isDawn) {
      const progress = (t - TIME.DAWN) / (TIME.DAY - TIME.DAWN);
      return 0.12 + progress * 0.88;
    }
    // Dusk
    const progress = (t - TIME.DUSK) / (TIME.NIGHT - TIME.DUSK);
    return 1.0 - progress * 0.88;
  }

  /** Sky color as hex string for the background gradient. */
  get skyColor() {
    const t = this.normalizedTime;
    if (this.isDay)   return '#1a88ff';
    if (this.isNight) return '#050820';
    if (this.isDawn)  return lerpColor('#ff7733', '#1a88ff', (t - TIME.DAWN) / (TIME.DAY - TIME.DAWN));
    return lerpColor('#1a88ff', '#ff4422', (t - TIME.DUSK) / (TIME.NIGHT - TIME.DUSK));
  }

  get hourString() {
    const totalMinutes = Math.floor(this.normalizedTime * 1440);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  serialize() { return { t: this.normalizedTime }; }
  deserialize(d) { if (d) this.normalizedTime = d.t ?? 0.35; }
}

function lerpColor(a, b, t) {
  const ai = parseInt(a.slice(1), 16);
  const bi = parseInt(b.slice(1), 16);
  const ar = (ai >> 16) & 0xff, ag = (ai >> 8) & 0xff, ab = ai & 0xff;
  const br = (bi >> 16) & 0xff, bg = (bi >> 8) & 0xff, bb = bi & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
}
