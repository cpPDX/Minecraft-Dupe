import { TILES, BIOME, WORLD_WIDTH, WORLD_HEIGHT, CHUNK_SIZE, LAYER } from '../utils/constants.js';
import { TileRegistry } from '../utils/TileRegistry.js';

// Seedable Perlin noise (no external dep)
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => {
    const g = h & 7;
    const u = g < 4 ? x : y;
    const v = g < 4 ? y : x;
    return ((g & 1) ? -u : u) + ((g & 2) ? -v : v);
  };

  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[a],     x,   y),   grad(perm[b],     x-1, y),   u),
      lerp(grad(perm[a + 1], x,   y-1), grad(perm[b + 1], x-1, y-1), u),
      v
    );
  };
}

// Fractal Brownian Motion using the base noise
function fbm(noise, x, y, octaves, lacunarity, gain) {
  let val = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val    += noise(x * freq, y * freq) * amp;
    maxAmp += amp;
    amp    *= gain;
    freq   *= lacunarity;
  }
  return val / maxAmp;
}

export class World {
  constructor(seed) {
    this.seed   = seed;
    this.chunks = new Map();       // `cx,cy` -> Uint16Array(CHUNK_SIZE²)
    this.dirty  = new Set();       // chunk keys that need re-render

    // Distinct noise functions per purpose
    this.heightNoise = makeNoise(seed);
    this.caveNoise1  = makeNoise(seed ^ 0xdeadbeef);
    this.caveNoise2  = makeNoise(seed ^ 0xcafebabe);
    this.biomeNoise  = makeNoise(seed ^ 0x12345678);
    this.oreNoise    = makeNoise(seed ^ 0xabcdef01);
    this.detailNoise = makeNoise(seed ^ 0x11223344);
    this.treeNoise   = makeNoise(seed ^ 0x55667788);

    // Cache surface heights for the full world width
    this._surfaceCache = new Int16Array(WORLD_WIDTH);
    this._surfaceDirty = true;
  }

  // ─── Tile access ───────────────────────────────────────────────────────────

  getTile(tx, ty) {
    if (tx < 0 || tx >= WORLD_WIDTH)  return TILES.AIR;
    if (ty < 0)                        return TILES.AIR;
    if (ty >= WORLD_HEIGHT)            return TILES.BEDROCK;
    const cx = tx >> 5, cy = ty >> 5;   // fast divide by CHUNK_SIZE (32)
    return this._getChunk(cx, cy)[((ty & 31) << 5) | (tx & 31)];
  }

  setTile(tx, ty, id) {
    if (tx < 0 || tx >= WORLD_WIDTH || ty < 0 || ty >= WORLD_HEIGHT) return;
    const cx = tx >> 5, cy = ty >> 5;
    this._getChunk(cx, cy)[((ty & 31) << 5) | (tx & 31)] = id;
    this.dirty.add(`${cx},${cy}`);
  }

  isSolid(tx, ty) {
    return TileRegistry.isSolid(this.getTile(tx, ty));
  }

  // ─── Surface height ─────────────────────────────────────────────────────

  getSurfaceHeight(tx) {
    if (tx < 0 || tx >= WORLD_WIDTH) return LAYER.SURFACE_TOP;
    if (this._surfaceDirty) this._buildSurfaceCache();
    return this._surfaceCache[tx];
  }

  _buildSurfaceCache() {
    for (let tx = 0; tx < WORLD_WIDTH; tx++) {
      this._surfaceCache[tx] = this._calcSurfaceY(tx);
    }
    this._surfaceDirty = false;
  }

  _calcSurfaceY(tx) {
    const nx = tx / WORLD_WIDTH;
    // 4-octave FBM for interesting hills
    const h = fbm(this.heightNoise, nx * 6, 0, 4, 2.0, 0.5);
    return Math.floor(95 + h * 22) | 0;
  }

  getBiome(tx) {
    const nx = tx / WORLD_WIDTH;
    const bn = (this.biomeNoise(nx * 4, 500) + 1) / 2;
    if (bn < 0.18) return BIOME.SNOW;
    if (bn < 0.38) return BIOME.DESERT;
    if (bn < 0.72) return BIOME.FOREST;
    return BIOME.JUNGLE;
  }

  // ─── Chunk generation ───────────────────────────────────────────────────

  _getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (!this.chunks.has(key)) this._generateChunk(cx, cy, key);
    return this.chunks.get(key);
  }

  _generateChunk(cx, cy, key) {
    const data = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
    const baseX = cx << 5;
    const baseY = cy << 5;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const surfY = this._calcSurfaceY(tx);
      const biome = this.getBiome(tx);

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const ty = baseY + ly;
        data[(ly << 5) | lx] = this._genTile(tx, ty, surfY, biome);
      }
    }

    this.chunks.set(key, data);
    this.dirty.add(key);

    // Populate surface features after base tiles exist
    this._populateFeatures(cx, cy, baseX, baseY);
  }

  _genTile(tx, ty, surfY, biome) {
    // Bottom bedrock
    if (ty >= WORLD_HEIGHT - 3) return TILES.BEDROCK;

    // Sky / above surface
    if (ty < surfY) return TILES.AIR;

    // Underworld (below cavern)
    if (ty >= LAYER.CAVERN_BOTTOM) {
      if (ty >= LAYER.CAVERN_BOTTOM + 10) {
        const nv = this.detailNoise(tx / 30, ty / 30);
        if (nv > 0.3) return TILES.LAVA;
        return TILES.HELLSTONE;
      }
      return TILES.NETHERRACK;
    }

    // Cave carving
    if (ty > surfY + 5) {
      const c1 = this.caveNoise1(tx / 18, ty / 14);
      const c2 = this.caveNoise2(tx / 14 + 40, ty / 14 + 40);
      if (c1 * c2 > 0.12) return TILES.AIR;
    }

    // Surface layer
    if (ty === surfY) {
      if (biome === BIOME.DESERT)  return TILES.SAND;
      if (biome === BIOME.SNOW)    return TILES.GRASS_SNOW;
      return TILES.GRASS;
    }

    const depth = ty - surfY;

    // Shallow dirt/biome layer
    if (depth < 5) {
      if (biome === BIOME.DESERT)  return TILES.SAND;
      if (biome === BIOME.SNOW)    return depth === 1 ? TILES.SNOW_DIRT : TILES.DIRT;
      return TILES.DIRT;
    }

    // Sandstone under desert sand
    if (biome === BIOME.DESERT && depth < 15) return TILES.SANDSTONE;

    // Check for ores
    const ore = this._getOre(tx, ty);
    if (ore) return ore;

    return TILES.STONE;
  }

  _getOre(tx, ty) {
    const v = (this.oreNoise(tx / 18, ty / 14) + 1) * 0.5;
    if (ty > 50  && ty < 200 && v > 0.82) return TILES.COAL_ORE;
    if (ty > 80  && ty < 280 && v > 0.87) return TILES.IRON_ORE;
    if (ty > 150 && ty < 350 && v > 0.91) return TILES.GOLD_ORE;
    if (ty > 250 && ty < 450 && v > 0.95) return TILES.DIAMOND_ORE;
    if (ty > 60  && ty < 180 && v > 0.85 && this.detailNoise(tx / 10, ty / 10) > 0.6) return TILES.CLAY;
    return null;
  }

  _populateFeatures(cx, cy, baseX, baseY) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const tx = baseX + lx;
      const surfY = this._calcSurfaceY(tx);
      const biome = this.getBiome(tx);

      // Only add features where the surface row falls inside this chunk
      if (surfY < baseY || surfY >= baseY + CHUNK_SIZE) continue;

      const rng = (this.treeNoise(tx * 0.13, cy * 7.3) + 1) * 0.5;
      const rng2 = (this.detailNoise(tx * 0.19, cy * 4.7) + 1) * 0.5;

      // Trees
      if (biome !== BIOME.DESERT) {
        if (rng > 0.62 && lx > 2 && lx < CHUNK_SIZE - 3) {
          this._placeTree(tx, surfY - 1, biome);
        }
      }

      // Cacti
      if (biome === BIOME.DESERT && rng > 0.70) {
        const h = 2 + Math.floor(rng2 * 3);
        for (let i = 0; i <= h; i++) this.setTile(tx, surfY - 1 - i, TILES.CACTUS);
      }

      // Surface decoration (flowers, grass tufts)
      if (biome === BIOME.FOREST || biome === BIOME.JUNGLE) {
        if (rng2 > 0.78) this.setTile(tx, surfY - 1, rng > 0.5 ? TILES.FLOWER_RED : TILES.FLOWER_YELLOW);
        else if (rng2 > 0.65) this.setTile(tx, surfY - 1, TILES.TALL_GRASS);
      }
      if (biome === BIOME.SNOW && rng2 > 0.82) {
        this.setTile(tx, surfY, TILES.SNOW_DIRT);
      }
    }
  }

  _placeTree(tx, topY, biome) {
    const logId    = biome === BIOME.JUNGLE ? TILES.JUNGLE_LOG  : biome === BIOME.SNOW ? TILES.PINE_LOG   : TILES.OAK_LOG;
    const leavesId = biome === BIOME.JUNGLE ? TILES.JUNGLE_LEAVES : biome === BIOME.SNOW ? TILES.PINE_LEAVES : TILES.OAK_LEAVES;
    const height   = biome === BIOME.JUNGLE ? 8 : biome === BIOME.SNOW ? 6 : 5;

    for (let i = 0; i < height; i++) {
      this.setTile(tx, topY - i, logId);
    }

    const leavesTop = topY - height;
    // Round leaf canopy
    const radius = biome === BIOME.JUNGLE ? 3 : 2;
    for (let dy = -1; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius + (dy < 0 ? 1 : 0)) {
          const ltx = tx + dx, lty = leavesTop + dy;
          if (this.getTile(ltx, lty) === TILES.AIR) {
            this.setTile(ltx, lty, leavesId);
          }
        }
      }
    }
  }

  // ─── Physics helpers ────────────────────────────────────────────────────

  /**
   * Move an AABB (px,py,pw,ph) by (mvx,mvy) per second, resolving tile collisions.
   * Returns { x, y, vx, vy, onGround, onCeiling, onWall }
   */
  moveAndCollide(px, py, pw, ph, mvx, mvy, dt) {
    const TS = 16;
    let x = px, y = py, vx = mvx, vy = mvy;
    let onGround = false, onCeiling = false, onWall = false;

    // Horizontal
    const dx = vx * dt;
    x += dx;
    if (dx !== 0) {
      if (dx < 0) {
        const tileX = Math.floor(x / TS);
        const t0 = Math.floor((y + 1) / TS);
        const t1 = Math.floor((y + ph - 2) / TS);
        for (let ty = t0; ty <= t1; ty++) {
          if (this.isSolid(tileX, ty)) {
            x = (tileX + 1) * TS;
            vx = 0; onWall = true; break;
          }
        }
      } else {
        const tileX = Math.floor((x + pw - 1) / TS);
        const t0 = Math.floor((y + 1) / TS);
        const t1 = Math.floor((y + ph - 2) / TS);
        for (let ty = t0; ty <= t1; ty++) {
          if (this.isSolid(tileX, ty)) {
            x = tileX * TS - pw;
            vx = 0; onWall = true; break;
          }
        }
      }
    }

    // Vertical
    const dy = vy * dt;
    y += dy;
    if (dy > 0) {
      const tileY = Math.floor((y + ph) / TS);
      const t0 = Math.floor((x + 1) / TS);
      const t1 = Math.floor((x + pw - 2) / TS);
      for (let ttx = t0; ttx <= t1; ttx++) {
        if (this.isSolid(ttx, tileY)) {
          y = tileY * TS - ph;
          vy = 0; onGround = true; break;
        }
      }
    } else if (dy < 0) {
      const tileY = Math.floor(y / TS);
      const t0 = Math.floor((x + 1) / TS);
      const t1 = Math.floor((x + pw - 2) / TS);
      for (let ttx = t0; ttx <= t1; ttx++) {
        if (this.isSolid(ttx, tileY)) {
          y = (tileY + 1) * TS;
          vy = 0; onCeiling = true; break;
        }
      }
    }

    return { x, y, vx, vy, onGround, onCeiling, onWall };
  }

  // ─── Spawn point ────────────────────────────────────────────────────────

  getSpawnPoint() {
    const tx = WORLD_WIDTH >> 1;
    const ty = this.getSurfaceHeight(tx) - 2;
    return { x: tx * 16 + 8, y: ty * 16 };
  }
}
