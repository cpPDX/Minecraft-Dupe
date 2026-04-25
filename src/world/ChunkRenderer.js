import { TILES, CHUNK_SIZE, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants.js';
import { TileRegistry } from '../utils/TileRegistry.js';

// How many chunks beyond the viewport to keep loaded
const LOAD_BUFFER  = 2;
const UNLOAD_EXTRA = 4;

export class ChunkRenderer {
  constructor(scene, world) {
    this.scene  = scene;
    this.world  = world;
    this.active = new Map();   // key -> { image, canvas, ctx }
    this._drawFns = buildDrawFns();
  }

  /** Call every frame with the camera's world-space viewport. */
  update(camLeft, camTop, viewW, viewH, zoom) {
    const TS  = TILE_SIZE;
    const CS  = CHUNK_SIZE;
    const pxW = CS * TS;

    const cxMin = Math.max(0, Math.floor(camLeft / pxW) - LOAD_BUFFER);
    const cyMin = Math.max(0, Math.floor(camTop  / pxW) - LOAD_BUFFER);
    const cxMax = Math.min(Math.ceil(WORLD_WIDTH  / CS) - 1, Math.ceil((camLeft + viewW / zoom) / pxW) + LOAD_BUFFER);
    const cyMax = Math.min(Math.ceil(WORLD_HEIGHT / CS) - 1, Math.ceil((camTop  + viewH / zoom) / pxW) + LOAD_BUFFER);

    // Load / refresh dirty visible chunks
    for (let cy = cyMin; cy <= cyMax; cy++) {
      for (let cx = cxMin; cx <= cxMax; cx++) {
        const key = `${cx},${cy}`;
        if (!this.active.has(key)) {
          this._activate(cx, cy, key);
        } else if (this.world.dirty.has(key)) {
          this._redraw(cx, cy, key);
          this.world.dirty.delete(key);
        }
      }
    }

    // Unload far chunks
    for (const [key, entry] of this.active) {
      const [cx, cy] = key.split(',').map(Number);
      if (cx < cxMin - UNLOAD_EXTRA || cx > cxMax + UNLOAD_EXTRA ||
          cy < cyMin - UNLOAD_EXTRA || cy > cyMax + UNLOAD_EXTRA) {
        entry.image.destroy();
        this.active.delete(key);
      }
    }
  }

  _activate(cx, cy, key) {
    const pxW = CHUNK_SIZE * TILE_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width  = pxW;
    canvas.height = pxW;
    const ctx = canvas.getContext('2d');

    this._renderToCanvas(cx, cy, ctx);

    const texKey = `chunk_${key}`;
    if (this.scene.textures.exists(texKey)) this.scene.textures.remove(texKey);
    this.scene.textures.addCanvas(texKey, canvas);

    const wx = cx * pxW;
    const wy = cy * pxW;
    const image = this.scene.add.image(wx, wy, texKey).setOrigin(0, 0).setDepth(0);

    this.active.set(key, { image, canvas, ctx });
    this.world.dirty.delete(key);
  }

  _redraw(cx, cy, key) {
    const entry = this.active.get(key);
    if (!entry) { this._activate(cx, cy, key); return; }

    entry.ctx.clearRect(0, 0, CHUNK_SIZE * TILE_SIZE, CHUNK_SIZE * TILE_SIZE);
    this._renderToCanvas(cx, cy, entry.ctx);

    const texKey = `chunk_${key}`;
    // Update the existing canvas texture in place
    const tex = this.scene.textures.get(texKey);
    if (tex) tex.refresh();
    else {
      this.scene.textures.addCanvas(texKey, entry.canvas);
      entry.image.setTexture(texKey);
    }
  }

  _renderToCanvas(cx, cy, ctx) {
    const TS    = TILE_SIZE;
    const CS    = CHUNK_SIZE;
    const baseX = cx * CS;
    const baseY = cy * CS;

    for (let ly = 0; ly < CS; ly++) {
      for (let lx = 0; lx < CS; lx++) {
        const tileId = this.world.getTile(baseX + lx, baseY + ly);
        if (tileId === TILES.AIR) continue;
        const px = lx * TS;
        const py = ly * TS;
        const fn = this._drawFns[tileId];
        if (fn) {
          fn(ctx, px, py, TS);
        } else {
          ctx.fillStyle = TileRegistry.cssColor(tileId);
          ctx.fillRect(px, py, TS, TS);
        }
      }
    }
  }

  /** Force a single tile's chunk to redraw next update. */
  markDirty(tx, ty) {
    const cx = tx >> 5, cy = ty >> 5;
    this.world.dirty.add(`${cx},${cy}`);
  }

  destroyAll() {
    for (const [, entry] of this.active) entry.image.destroy();
    this.active.clear();
  }
}

// ─── Procedural tile drawing functions ────────────────────────────────────────

function buildDrawFns() {
  const fns = {};

  // Helper: draw a tile as solid fill + subtle texture
  const solid = (color, details) => (ctx, px, py, s) => {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, s, s);
    if (details) details(ctx, px, py, s);
  };

  // Speckle ore helper
  const ore = (base, speckle, sx, sy, sw) => (ctx, px, py, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#606060';
    ctx.fillRect(px+1,   py+1,   5, 5);
    ctx.fillRect(px+8,   py+7,   5, 5);
    ctx.fillStyle = speckle;
    ctx.fillRect(px+sx,  py+sy,  sw, sw);
    ctx.fillRect(px+sx+7,py+sy+5,sw, sw);
    ctx.fillRect(px+sx+3,py+sy+9,sw, sw);
  };

  fns[TILES.GRASS] = (ctx, px, py, s) => {
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#5d8a3c'; ctx.fillRect(px, py, s, 5);
    ctx.fillStyle = '#4a7a2c';
    ctx.fillRect(px+2, py+1, 2, 3); ctx.fillRect(px+7, py+1, 2, 3); ctx.fillRect(px+12, py+1, 2, 3);
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(px+3, py+8, 2, 2); ctx.fillRect(px+10, py+12, 2, 2);
  };

  fns[TILES.DIRT] = solid('#6b3a2a', (ctx, px, py) => {
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(px+2, py+3, 2, 2); ctx.fillRect(px+9, py+8, 2, 2); ctx.fillRect(px+5, py+12, 2, 2);
  });

  fns[TILES.STONE] = solid('#7a7a7a', (ctx, px, py) => {
    ctx.fillStyle = '#606060';
    ctx.fillRect(px+1, py+1, 5, 5); ctx.fillRect(px+8, py+7, 5, 5);
    ctx.fillStyle = '#909090';
    ctx.fillRect(px+3, py+10, 4, 4);
  });

  fns[TILES.SAND] = solid('#d4b463', (ctx, px, py) => {
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(px+2, py+4, 3, 2); ctx.fillRect(px+9, py+10, 3, 2);
  });

  fns[TILES.GRAVEL] = solid('#808080', (ctx, px, py) => {
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(px+2, py+3, 4, 4); ctx.fillRect(px+9, py+9, 4, 4);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(px+5, py+1, 3, 3);
  });

  fns[TILES.BEDROCK] = solid('#1a1a1a', (ctx, px, py) => {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(px+3, py+3, 4, 4); ctx.fillRect(px+10, py+9, 4, 4);
  });

  fns[TILES.SNOW_DIRT] = (ctx, px, py, s) => {
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#e8eeff'; ctx.fillRect(px, py, s, 6);
    ctx.fillStyle = '#d0d8ff'; ctx.fillRect(px+2, py+2, 3, 2); ctx.fillRect(px+9, py+3, 3, 2);
  };

  fns[TILES.COAL_ORE] = ore('#7a7a7a', '#222222', 2, 2, 3);
  fns[TILES.IRON_ORE] = ore('#7a7a7a', '#c87850', 2, 2, 3);
  fns[TILES.GOLD_ORE] = ore('#7a7a7a', '#ffd700', 2, 2, 3);
  fns[TILES.DIAMOND_ORE] = ore('#7a7a7a', '#44ddff', 2, 2, 3);
  fns[TILES.HELLSTONE] = ore('#4a1a00', '#ff4400', 2, 2, 3);

  fns[TILES.OBSIDIAN] = solid('#1a0a2a', (ctx, px, py) => {
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(px+2, py+2, 5, 5); ctx.fillRect(px+9, py+9, 5, 5);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(px+7, py+2, 3, 3);
  });

  fns[TILES.SANDSTONE] = solid('#c8a850', (ctx, px, py) => {
    ctx.fillStyle = '#b89030';
    ctx.fillRect(px, py+5, 16, 1); ctx.fillRect(px, py+10, 16, 1);
    ctx.fillRect(px+4, py, 1, 16); ctx.fillRect(px+11, py, 1, 16);
  });

  fns[TILES.ICE] = (ctx, px, py, s) => {
    ctx.fillStyle = '#b0d0e0'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(px+2, py+2, 4, 2); ctx.fillRect(px+9, py+9, 5, 2);
    ctx.fillStyle = 'rgba(150,200,230,0.6)';
    ctx.fillRect(px+5, py+5, 7, 7);
  };

  fns[TILES.OAK_LOG] = (ctx, px, py, s) => {
    ctx.fillStyle = '#8B6914'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(px+2, py, 12, s);
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(px+2, py+1, 12, 1); ctx.fillRect(px+2, py+7, 12, 1); ctx.fillRect(px+2, py+13, 12, 1);
    ctx.fillRect(px+4, py+3, 2, 1); ctx.fillRect(px+9, py+10, 2, 1);
  };

  fns[TILES.PINE_LOG] = (ctx, px, py, s) => {
    ctx.fillStyle = '#7B5A10'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#4a2a0a'; ctx.fillRect(px+2, py, 12, s);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(px+2, py+1, 12, 1); ctx.fillRect(px+2, py+8, 12, 1); ctx.fillRect(px+2, py+14, 12, 1);
  };

  fns[TILES.JUNGLE_LOG] = (ctx, px, py, s) => {
    ctx.fillStyle = '#6B8A20'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#3a5a1a'; ctx.fillRect(px+2, py, 12, s);
    ctx.fillStyle = '#4a6a2a';
    ctx.fillRect(px+2, py+1, 12, 1); ctx.fillRect(px+2, py+8, 12, 1);
  };

  const leavesTexture = (base, shade) => (ctx, px, py, s) => {
    ctx.fillStyle = base; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = shade;
    ctx.fillRect(px+1, py+1, 3, 3); ctx.fillRect(px+6, py+5, 4, 4);
    ctx.fillRect(px+11, py+2, 3, 3); ctx.fillRect(px+3, py+10, 5, 4);
    ctx.fillRect(px+11, py+10, 3, 4);
  };

  fns[TILES.OAK_LEAVES]    = leavesTexture('#2a7a1a', '#1a5a10');
  fns[TILES.PINE_LEAVES]   = leavesTexture('#1a5a0a', '#0a3a00');
  fns[TILES.JUNGLE_LEAVES] = leavesTexture('#1a8a2a', '#0a6010');

  fns[TILES.CACTUS] = (ctx, px, py, s) => {
    ctx.fillStyle = '#2a7a1a'; ctx.fillRect(px+4, py, 8, s);
    ctx.fillStyle = '#1a5a0a'; ctx.fillRect(px+5, py, 6, s);
    ctx.fillStyle = '#2a8a2a'; ctx.fillRect(px+6, py+3, 4, 1); ctx.fillRect(px+6, py+10, 4, 1);
  };

  fns[TILES.COBBLESTONE] = solid('#606060', (ctx, px, py) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(px+1, py+1, 6, 6); ctx.fillRect(px+9, py+8, 6, 6);
    ctx.fillStyle = '#404040';
    ctx.fillRect(px+8, py+1, 1, 6); ctx.fillRect(px+1, py+8, 6, 1);
  });

  fns[TILES.OAK_PLANKS] = solid('#c8964a', (ctx, px, py) => {
    ctx.fillStyle = '#a87a30';
    ctx.fillRect(px, py+5, 16, 1); ctx.fillRect(px, py+10, 16, 1);
    ctx.fillRect(px+8, py, 1, 5); ctx.fillRect(px+4, py+6, 1, 4); ctx.fillRect(px+12, py+6, 1, 4);
    ctx.fillRect(px+8, py+11, 1, 5);
  });

  fns[TILES.PINE_PLANKS] = solid('#8a5a2a', (ctx, px, py) => {
    ctx.fillStyle = '#6a3a10';
    ctx.fillRect(px, py+5, 16, 1); ctx.fillRect(px, py+10, 16, 1);
    ctx.fillRect(px+8, py, 1, 5);
  });

  fns[TILES.STONE_BRICK] = solid('#5a5a6a', (ctx, px, py) => {
    ctx.fillStyle = '#404050';
    ctx.fillRect(px, py+7, 16, 1); ctx.fillRect(px+8, py, 1, 7); ctx.fillRect(px+4, py+8, 1, 8);
    ctx.fillStyle = '#7a7a8a';
    ctx.fillRect(px+2, py+2, 5, 4); ctx.fillRect(px+10, py+9, 5, 5);
  });

  fns[TILES.GLASS] = (ctx, px, py, s) => {
    ctx.fillStyle = 'rgba(128,192,224,0.6)'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = 'rgba(200,240,255,0.5)';
    ctx.fillRect(px+2, py+2, 5, 5); ctx.fillRect(px+9, py+9, 5, 5);
    ctx.strokeStyle = '#80c0e0'; ctx.lineWidth = 1;
    ctx.strokeRect(px+0.5, py+0.5, s-1, s-1);
  };

  fns[TILES.TORCH] = (ctx, px, py, s) => {
    ctx.fillStyle = '#8b6914'; ctx.fillRect(px+6, py+8, 4, 8);
    ctx.fillStyle = '#ff9900'; ctx.fillRect(px+5, py+4, 6, 5);
    ctx.fillStyle = '#ffee44'; ctx.fillRect(px+6, py+3, 4, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px+7, py+3, 2, 2);
  };

  fns[TILES.CHEST] = (ctx, px, py, s) => {
    ctx.fillStyle = '#c89632'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#8b6914'; ctx.fillRect(px+1, py+7, 14, 1);
    ctx.fillStyle = '#5a3a00';
    ctx.fillRect(px+1, py+1, 14, 5); ctx.fillRect(px+1, py+8, 14, 6);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(px+6, py+6, 4, 3);
    ctx.fillStyle = '#c89632'; ctx.fillRect(px+7, py+7, 2, 1);
  };

  fns[TILES.CRAFTING_TABLE] = (ctx, px, py, s) => {
    ctx.fillStyle = '#8b4513'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#c8964a'; ctx.fillRect(px, py, s, 8);
    ctx.fillStyle = '#5a2a00'; ctx.fillRect(px, py+8, s, 8);
    ctx.fillStyle = '#8b6914'; ctx.fillRect(px+7, py, 1, s); ctx.fillRect(px, py+7, s, 1);
    ctx.fillStyle = '#ff4444'; ctx.fillRect(px+2, py+2, 4, 4);
    ctx.fillStyle = '#4444ff'; ctx.fillRect(px+9, py+2, 5, 4);
    ctx.fillStyle = '#44ff44'; ctx.fillRect(px+2, py+10, 4, 4);
  };

  fns[TILES.FURNACE] = (ctx, px, py, s) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#606060';
    ctx.fillRect(px+1, py+1, 14, 14);
    ctx.fillStyle = '#ff4400'; ctx.fillRect(px+4, py+6, 8, 6);
    ctx.fillStyle = '#ff8800'; ctx.fillRect(px+5, py+7, 6, 4);
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(px+6, py+8, 4, 2);
    ctx.fillStyle = '#333333';
    ctx.fillRect(px+4, py+2, 8, 3);
    ctx.fillStyle = '#222222';
    ctx.fillRect(px+5, py+3, 6, 1);
  };

  fns[TILES.WATER] = (ctx, px, py, s) => {
    ctx.fillStyle = 'rgba(26,90,154,0.75)'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = 'rgba(80,160,220,0.4)';
    ctx.fillRect(px+2, py+3, 12, 3); ctx.fillRect(px+2, py+10, 12, 3);
  };

  fns[TILES.LAVA] = (ctx, px, py, s) => {
    ctx.fillStyle = '#ff4400'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#ff8800'; ctx.fillRect(px+2, py+3, 12, 3); ctx.fillRect(px+2, py+10, 12, 3);
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(px+5, py+6, 6, 2);
  };

  fns[TILES.GRASS_SNOW] = (ctx, px, py, s) => {
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#e8eeff'; ctx.fillRect(px, py, s, 5);
    ctx.fillStyle = '#d0d8ff'; ctx.fillRect(px+2, py+1, 3, 2); ctx.fillRect(px+9, py+2, 3, 2);
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(px+3, py+8, 2, 2); ctx.fillRect(px+10, py+12, 2, 2);
  };

  fns[TILES.FLOWER_RED] = (ctx, px, py, s) => {
    ctx.fillStyle = '#2a8a1a'; ctx.fillRect(px+7, py+8, 2, 8);
    ctx.fillStyle = '#ff2222'; ctx.fillRect(px+4, py+2, 8, 8);
    ctx.fillStyle = '#ff8888'; ctx.fillRect(px+5, py+3, 6, 6);
    ctx.fillStyle = '#ffee00'; ctx.fillRect(px+6, py+4, 4, 4);
  };

  fns[TILES.FLOWER_YELLOW] = (ctx, px, py, s) => {
    ctx.fillStyle = '#2a8a1a'; ctx.fillRect(px+7, py+8, 2, 8);
    ctx.fillStyle = '#ffdd00'; ctx.fillRect(px+4, py+2, 8, 8);
    ctx.fillStyle = '#ffee88'; ctx.fillRect(px+5, py+3, 6, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px+6, py+4, 4, 4);
  };

  fns[TILES.TALL_GRASS] = (ctx, px, py, s) => {
    ctx.fillStyle = '#3a7a1a';
    ctx.fillRect(px+3, py+6, 2, 10); ctx.fillRect(px+7, py+4, 2, 12); ctx.fillRect(px+11, py+6, 2, 10);
    ctx.fillStyle = '#2a6a0a';
    ctx.fillRect(px+4, py+3, 1, 5); ctx.fillRect(px+11, py+3, 1, 5);
  };

  fns[TILES.VINE] = (ctx, px, py, s) => {
    ctx.fillStyle = '#1a6a0a';
    ctx.fillRect(px+3, py, 2, s); ctx.fillRect(px+9, py, 2, s);
    ctx.fillStyle = '#2a8a1a';
    ctx.fillRect(px+1, py+3, 5, 2); ctx.fillRect(px+7, py+9, 7, 2);
  };

  fns[TILES.GLOWSTONE] = (ctx, px, py, s) => {
    ctx.fillStyle = '#ffee88'; ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#ffd000'; ctx.fillRect(px+2, py+2, 5, 5); ctx.fillRect(px+9, py+9, 5, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px+5, py+5, 6, 6);
    ctx.fillStyle = '#ffee44'; ctx.fillRect(px+6, py+6, 4, 4);
  };

  fns[TILES.NETHERRACK] = solid('#6a1a1a', (ctx, px, py) => {
    ctx.fillStyle = '#8a2a2a';
    ctx.fillRect(px+2, py+3, 4, 4); ctx.fillRect(px+9, py+9, 4, 4);
    ctx.fillStyle = '#4a0a0a';
    ctx.fillRect(px+7, py+2, 3, 3);
  });

  fns[TILES.CLAY] = solid('#9aacbc', (ctx, px, py) => {
    ctx.fillStyle = '#8a9cac';
    ctx.fillRect(px+2, py+3, 4, 3); ctx.fillRect(px+9, py+9, 4, 3);
    ctx.fillStyle = '#aabccc'; ctx.fillRect(px+5, py+10, 5, 3);
  });

  fns[TILES.IRON_BLOCK] = solid('#c0c0c0', (ctx, px, py) => {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(px, py+7, 16, 2); ctx.fillRect(px+7, py, 2, 16);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(px+1, py+1, 5, 5); ctx.fillRect(px+10, py+10, 5, 5);
  });

  fns[TILES.GOLD_BLOCK] = solid('#ffd700', (ctx, px, py) => {
    ctx.fillStyle = '#c8a800';
    ctx.fillRect(px, py+7, 16, 2); ctx.fillRect(px+7, py, 2, 16);
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(px+1, py+1, 5, 5); ctx.fillRect(px+10, py+10, 5, 5);
  });

  fns[TILES.DIAMOND_BLOCK] = solid('#44ddff', (ctx, px, py) => {
    ctx.fillStyle = '#22aad0';
    ctx.fillRect(px, py+7, 16, 2); ctx.fillRect(px+7, py, 2, 16);
    ctx.fillStyle = '#aaeeff';
    ctx.fillRect(px+1, py+1, 5, 5); ctx.fillRect(px+10, py+10, 5, 5);
  });

  return fns;
}
