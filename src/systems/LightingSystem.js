import { TILES, TILE_SIZE, CHUNK_SIZE, MAX_LIGHT, TORCH_LIGHT, LAVA_LIGHT } from '../utils/constants.js';
import { TileRegistry } from '../utils/TileRegistry.js';

const UPDATE_INTERVAL = 100; // ms between lighting passes

export class LightingSystem {
  constructor(scene, world, timeSystem) {
    this.scene      = scene;
    this.world      = world;
    this.timeSystem = timeSystem;

    // Overlay graphics drawn on top of everything
    this.overlay = scene.add.graphics().setDepth(20).setScrollFactor(1);

    this._timer      = 0;
    this._lastCamX   = -9999;
    this._lastCamY   = -9999;
    this._lastAmbient = -1;
  }

  update(delta, camLeft, camTop, viewW, viewH, zoom) {
    this._timer += delta;
    if (this._timer < UPDATE_INTERVAL) return;
    this._timer = 0;

    const ambient = this.timeSystem.ambientLight;
    const camMoved = Math.abs(camLeft - this._lastCamX) > TILE_SIZE ||
                     Math.abs(camTop  - this._lastCamY) > TILE_SIZE ||
                     Math.abs(ambient - this._lastAmbient) > 0.02;

    if (!camMoved) return;
    this._lastCamX   = camLeft;
    this._lastCamY   = camTop;
    this._lastAmbient = ambient;

    this._render(camLeft, camTop, viewW, viewH, zoom, ambient);
  }

  _render(camLeft, camTop, viewW, viewH, zoom, ambient) {
    const TS  = TILE_SIZE;
    const effW = viewW  / zoom;
    const effH = viewH  / zoom;

    const txMin = Math.max(0, Math.floor(camLeft / TS) - 1);
    const tyMin = Math.max(0, Math.floor(camTop  / TS) - 1);
    const txMax = Math.min(txMin + Math.ceil(effW / TS) + 2, 4095);
    const tyMax = Math.min(tyMin + Math.ceil(effH / TS) + 2, 511);

    this.overlay.clear();

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const light = this._getTileLight(tx, ty, ambient);
        if (light >= 0.95) continue; // fully lit — skip
        const darkness = 1 - light;
        this.overlay.fillStyle(0x000000, darkness * 0.92);
        this.overlay.fillRect(tx * TS, ty * TS, TS, TS);
      }
    }
  }

  _getTileLight(tx, ty, ambient) {
    const tileId = this.world.getTile(tx, ty);

    // Emissive tiles
    const emit = TileRegistry.lightEmit(tileId);
    if (emit > 0) return Math.min(1, emit / MAX_LIGHT);

    // Check if sky-visible (no solid block above in the surface layer)
    if (ty < 90) return ambient;

    const surfY = this.world.getSurfaceHeight(tx);
    if (ty <= surfY) return ambient;

    // Underground: only lit by nearby sources (torch / lava / glowstone)
    let best = 0;
    const radius = 14;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const ltx = tx + dx, lty = ty + dy;
        if (ltx < 0 || lty < 0) continue;
        const lid = this.world.getTile(ltx, lty);
        const lemit = TileRegistry.lightEmit(lid);
        if (lemit > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const l = Math.max(0, (lemit / MAX_LIGHT) - dist / MAX_LIGHT);
          if (l > best) best = l;
        }
      }
    }

    // Bleed in from surface if close enough
    const depthFromSurface = ty - surfY;
    if (depthFromSurface < 10) {
      const bleed = ambient * Math.max(0, 1 - depthFromSurface / 10);
      if (bleed > best) best = bleed;
    }

    return best;
  }

  destroy() { this.overlay.destroy(); }
}
