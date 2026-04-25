import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CAMERA_ZOOM, TILE_SIZE, TILES, HOTBAR_SIZE, MAX_MOBS, MOB_DESPAWN_DIST, PLAYER } from '../utils/constants.js';
import { World }            from '../world/World.js';
import { ChunkRenderer }    from '../world/ChunkRenderer.js';
import { Player }           from '../entities/Player.js';
import { Mob, MOB_DEFS }    from '../entities/Mob.js';
import { Drop }             from '../entities/Drop.js';
import { InventorySystem }  from '../systems/InventorySystem.js';
import { CraftingSystem }   from '../systems/CraftingSystem.js';
import { TimeSystem }       from '../systems/TimeSystem.js';
import { LightingSystem }   from '../systems/LightingSystem.js';
import { SaveManager }      from '../systems/SaveManager.js';
import { TouchControls }    from '../ui/TouchControls.js';
import { TileRegistry }     from '../utils/TileRegistry.js';

// Hostile mob spawn table for surface (night) and underground
const SPAWN_TABLE = {
  surface_night: [
    { id: 'zombie',  w: 3 },
    { id: 'skeleton',w: 2 },
    { id: 'creeper', w: 1 },
    { id: 'slime',   w: 2 },
  ],
  underground: [
    { id: 'spider',  w: 3 },
    { id: 'zombie',  w: 2 },
    { id: 'slime',   w: 2 },
  ],
  underworld: [
    { id: 'lava_slime', w: 3 },
    { id: 'zombie',     w: 1 },
  ],
};

const PASSIVE_SPAWN = [
  { id: 'pig',    w: 2 },
  { id: 'rabbit', w: 3 },
];

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  // ─── Init ────────────────────────────────────────────────────────────────

  init(data) {
    this.worldSeed = data.seed   ?? Math.floor(Math.random() * 1e9);
    this.saveData  = data.saveData ?? null;
    this._isNewGame = data.newGame !== false;
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  create() {
    // Sky background (behind everything)
    this._skyBg = this.add.rectangle(0, 0, GAME_WIDTH * 10, GAME_HEIGHT * 10, 0x1a88ff)
      .setOrigin(0).setDepth(-5).setScrollFactor(0.0);

    // World
    this.world          = new World(this.worldSeed);
    this.chunkRenderer  = new ChunkRenderer(this, this.world);

    // Parallax layers (simple colored bands)
    this._buildParallax();

    // Systems
    this.inventory  = new InventorySystem();
    this.crafting   = new CraftingSystem(this.inventory);
    this.timeSystem = new TimeSystem();
    this.saveManager = new SaveManager();

    // Spawn point
    const spawn = this.world.getSpawnPoint();

    // Load save if available
    if (this.saveData) {
      this.inventory.deserialize(this.saveData.inventory);
      this.timeSystem.deserialize(this.saveData.time);
      if (this.saveData.chunks) this._loadChunkData(this.saveData.chunks);
    } else {
      // Give starter items
      this.inventory.addItem('oak_log', 5);
      this.inventory.addItem('torch', 4);
    }

    // Player
    const px = this.saveData?.player?.x ?? spawn.x;
    const py = this.saveData?.player?.y ?? spawn.y;
    this.player = new Player(this, px, py, this.inventory);
    if (this.saveData?.player) {
      this.player.hp     = this.saveData.player.hp     ?? PLAYER.MAX_HP;
      this.player.hunger = this.saveData.player.hunger ?? PLAYER.MAX_HUNGER;
    }

    // Lighting (must be after player)
    this.lighting = new LightingSystem(this, this.world, this.timeSystem);

    // Camera
    const cam = this.cameras.main;
    cam.setZoom(CAMERA_ZOOM);
    cam.setBounds(0, 0, 4096 * TILE_SIZE, 512 * TILE_SIZE);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.setDeadzone(GAME_WIDTH * 0.15, GAME_HEIGHT * 0.25);

    // Input / controls
    this.controls = new TouchControls(this);
    this._setupKeyboard();

    // Mobs and drops
    this.mobs  = [];
    this.drops = [];

    // Mob spawner timer
    this._spawnTimer  = 0;
    this._passiveSpawnTimer = 0;

    // Auto-save timer
    this._saveTimer = 0;

    // HUD wiring
    this.registry.set('game', this);

    // Scene events
    this.events.on('tileChanged', this._onTileChanged, this);
    this.events.on('playerDied',  this._onPlayerDied,  this);

    // Mouse interaction
    this._setupMouseInteraction();

    // Hint system
    this._shownHints = new Set(JSON.parse(localStorage.getItem('forge_hints') || '[]'));
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this.player || this.player.dead) return;

    // Gather input
    const cam  = this.cameras.main;
    const zoom = cam.zoom;
    const ptr  = this.input.activePointer;
    const input = this.controls.poll(ptr.x, ptr.y, cam.scrollX, cam.scrollY, zoom);
    this._mergeKeyboard(input);

    // Update player
    this.player.update(time, delta, input);
    this.controls.flush();

    // Update world chunks
    this.chunkRenderer.update(cam.scrollX, cam.scrollY, GAME_WIDTH, GAME_HEIGHT, zoom);

    // Update time + sky
    this.timeSystem.update(delta);
    this._updateSky();

    // Lighting
    this.lighting.update(delta, cam.scrollX, cam.scrollY, GAME_WIDTH, GAME_HEIGHT, zoom);

    // Update drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      if (this.drops[i].collected) { this.drops.splice(i, 1); continue; }
      this.drops[i].update(delta, this.world, this.player);
    }

    // Update mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (mob.dead && mob.deathTimer >= 500) {
        this.mobs.splice(i, 1);
        continue;
      }
      mob.update(delta, this.world, this.player, time);
    }

    // Mob spawning
    this._spawnTimer += delta;
    this._passiveSpawnTimer += delta;
    if (this._spawnTimer > 4000) { this._trySpawn(); this._spawnTimer = 0; }
    if (this._passiveSpawnTimer > 10000) { this._trySpawnPassive(); this._passiveSpawnTimer = 0; }

    // Despawn far mobs
    this._despawnMobs();

    // Auto-save
    this._saveTimer += delta;
    if (this._saveTimer >= 60000) { this._saveTimer = 0; this._autoSave(); }

    // Inventory keyboard shortcuts
    this._updateHotbarKeys();

    // Right-click placement
    this._handlePlace(input, time);

    // Interact
    this._handleInteract(input, time);

    // Emit HUD updates periodically
    this._hudTimer = (this._hudTimer || 0) + delta;
    if (this._hudTimer > 200) {
      this._hudTimer = 0;
      this._emitHUD();
    }
  }

  // ─── Input setup ─────────────────────────────────────────────────────────

  _setupKeyboard() {
    const kbd = this.input.keyboard;
    if (!kbd) return;
    this._kbd = {
      keys: kbd.addKeys({
        num1: Phaser.Input.Keyboard.KeyCodes.ONE,
        num2: Phaser.Input.Keyboard.KeyCodes.TWO,
        num3: Phaser.Input.Keyboard.KeyCodes.THREE,
        num4: Phaser.Input.Keyboard.KeyCodes.FOUR,
        num5: Phaser.Input.Keyboard.KeyCodes.FIVE,
        num6: Phaser.Input.Keyboard.KeyCodes.SIX,
        num7: Phaser.Input.Keyboard.KeyCodes.SEVEN,
        num8: Phaser.Input.Keyboard.KeyCodes.EIGHT,
        num9: Phaser.Input.Keyboard.KeyCodes.NINE,
        inv:  Phaser.Input.Keyboard.KeyCodes.E,
      }),
    };
  }

  _mergeKeyboard(input) {
    const kbd = this.input.keyboard;
    if (!kbd) return;
  }

  _updateHotbarKeys() {
    if (!this._kbd) return;
    const nums = [
      this._kbd.keys.num1, this._kbd.keys.num2, this._kbd.keys.num3,
      this._kbd.keys.num4, this._kbd.keys.num5, this._kbd.keys.num6,
      this._kbd.keys.num7, this._kbd.keys.num8, this._kbd.keys.num9,
    ];
    for (let i = 0; i < 9; i++) {
      if (Phaser.Input.Keyboard.JustDown(nums[i])) {
        this.inventory.hotbarIndex = i;
        this.events.emit('hotbarChanged', i);
      }
    }
    // Scroll wheel
    if (this.input.mouse) {
      const scroll = this.input.mouse.manager?.wheel ?? this.input.mousePointer?.deltaY;
    }

    if (Phaser.Input.Keyboard.JustDown(this._kbd.keys.inv)) {
      this._openInventory();
    }
  }

  _setupMouseInteraction() {
    this.input.on('pointerdown', (ptr) => {
      if (ptr.rightButtonDown()) {
        this._onRightClick(ptr);
      }
    });
    this.input.mouse?.disableContextMenu?.();
  }

  _handlePlace(input, time) {
    // Right-click on desktop triggers place
  }

  _onRightClick(ptr) {
    const cam  = this.cameras.main;
    const worldX = cam.scrollX + ptr.x / cam.zoom;
    const worldY = cam.scrollY + ptr.y / cam.zoom;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    this._placeOrInteract(tx, ty);
  }

  _handleInteract(input, time) {
    // Inventory open via touch
    if (input.inventoryJustPressed) this._openInventory();
    // Jump via touch button
    if (input.jumpJustPressed) {
      const player = this.player;
      if (player.onGround || player.coyote > 0) {
        player.vy = PLAYER.JUMP_VEL;
        player.coyote = 0;
      }
    }
  }

  _placeOrInteract(tx, ty) {
    const player = this.player;
    const dx = tx * TILE_SIZE + 8 - player.centerX;
    const dy = ty * TILE_SIZE + 8 - player.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > PLAYER.REACH_PX) return;

    const tileId = this.world.getTile(tx, ty);

    // Interact with special tiles
    if (tileId === TILES.CRAFTING_TABLE) {
      this._openCrafting('crafting_table'); return;
    }
    if (tileId === TILES.CHEST) {
      // TODO: chest UI
      return;
    }
    if (tileId === TILES.FURNACE) {
      this._openCrafting('furnace'); return;
    }

    // Place block
    const held = this.inventory.getHotbarItem(this.inventory.hotbarIndex);
    if (!held) return;
    const itemDef = held.def;
    if (!itemDef.tileId) return; // not placeable

    // Target must be empty (or surface deco), adjacent to a solid tile
    if (tileId !== TILES.AIR) return;
    const adjacentSolid =
      this.world.isSolid(tx - 1, ty) || this.world.isSolid(tx + 1, ty) ||
      this.world.isSolid(tx, ty - 1) || this.world.isSolid(tx, ty + 1);
    if (!adjacentSolid) return;

    // Don't place inside the player
    const overlap = tx * TILE_SIZE < player.x + player.w &&
                    (tx + 1) * TILE_SIZE > player.x &&
                    ty * TILE_SIZE < player.y + player.h &&
                    (ty + 1) * TILE_SIZE > player.y;
    if (overlap) return;

    this.world.setTile(tx, ty, itemDef.tileId);
    this.inventory.removeItem(held.itemId, 1);
    this.events.emit('tileChanged', tx, ty);
    this.events.emit('hotbarChanged');
  }

  // ─── Drop management ─────────────────────────────────────────────────────

  spawnDrop(x, y, itemId, count = 1) {
    const drop = new Drop(this, x, y, itemId, count);
    this.drops.push(drop);
    this._showHint(itemId);
  }

  collectDrop(drop) {
    const leftover = this.inventory.addItem(drop.itemId, drop.count);
    drop.destroy();
    this.events.emit('hotbarChanged');
    if (leftover > 0) {
      // Spawn a new drop for leftover — avoid infinite loop by marking it old
      const d2 = new Drop(this, drop.x, drop.y, drop.itemId, leftover);
      d2.age = 50000; // near-expiry
      this.drops.push(d2);
    }
  }

  // ─── Mob spawning ─────────────────────────────────────────────────────────

  _trySpawn() {
    if (this.mobs.length >= MAX_MOBS) return;
    const player = this.player;
    const isNight = this.timeSystem.isNight;

    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 12 + Math.random() * 6;
      const tx = player.tileX + Math.round(Math.cos(angle) * dist);
      const ty = player.tileY + Math.round(Math.sin(angle) * dist);

      if (tx < 0 || tx >= 4096 || ty < 0 || ty >= 512) continue;

      const surfY = this.world.getSurfaceHeight(tx);
      const onSurface = Math.abs(ty - surfY) < 3;
      const underground = ty > surfY + 5;
      const underworld  = ty > 430;

      // Only spawn in darkness (light <= 7 roughly)
      if (!isNight && onSurface) continue;

      let table;
      if (underworld)       table = SPAWN_TABLE.underworld;
      else if (underground) table = SPAWN_TABLE.underground;
      else if (isNight)     table = SPAWN_TABLE.surface_night;
      else continue;

      const mobId = _weightedPick(table);
      const def   = MOB_DEFS[mobId];
      if (!def) continue;

      // Ensure spawn position is on solid ground with air above
      const groundY = ty * TILE_SIZE;
      if (!this.world.isSolid(tx, ty + 1) || this.world.isSolid(tx, ty)) continue;

      const mob = new Mob(this, tx * TILE_SIZE + 8, groundY, def);
      this.mobs.push(mob);
      break;
    }
  }

  _trySpawnPassive() {
    if (this.mobs.filter(m => m.passive).length >= 15) return;
    const player = this.player;
    for (let a = 0; a < 4; a++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 14 + Math.random() * 4;
      const tx = player.tileX + Math.round(Math.cos(angle) * dist);
      const ty = player.tileY + Math.round(Math.sin(angle) * dist);
      if (tx < 0 || tx >= 4096) continue;
      const surfY = this.world.getSurfaceHeight(tx);
      if (Math.abs(ty - surfY) > 2) continue;
      if (!this.world.isSolid(tx, surfY + 1) || this.world.isSolid(tx, surfY)) continue;

      const mobId = _weightedPick(PASSIVE_SPAWN);
      const def   = MOB_DEFS[mobId];
      const mob   = new Mob(this, tx * TILE_SIZE + 8, surfY * TILE_SIZE, def);
      mob.passive = true;
      this.mobs.push(mob);
      break;
    }
  }

  _despawnMobs() {
    const px = this.player.tileX, py = this.player.tileY;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (mob.passive || mob.dead) continue;
      const mx = mob.x / TILE_SIZE, my = mob.y / TILE_SIZE;
      const d  = Math.abs(mx - px) + Math.abs(my - py);
      if (d > MOB_DESPAWN_DIST + 10) {
        mob.destroy();
        this.mobs.splice(i, 1);
      }
    }
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  _openInventory() {
    if (this.scene.isActive('InventoryScene')) {
      this.scene.stop('InventoryScene');
    } else {
      this.scene.launch('InventoryScene', { gameScene: this });
    }
  }

  _openCrafting(station) {
    const key = station === 'crafting_table' ? 'CraftingScene' : 'FurnaceScene';
    if (this.scene.isActive(key)) { this.scene.stop(key); return; }
    this.scene.launch(key, { gameScene: this, station });
  }

  // ─── Sky & parallax ──────────────────────────────────────────────────────

  _buildParallax() {
    // Far mountains
    this._px1 = this.add.graphics().setDepth(-4).setScrollFactor(0.05);
    this._px2 = this.add.graphics().setDepth(-3).setScrollFactor(0.15);
    this._px3 = this.add.graphics().setDepth(-2).setScrollFactor(0.35);
    this._drawParallax();
  }

  _drawParallax() {
    const W = 8000, H = GAME_HEIGHT;

    // Far mountains
    this._px1.clear();
    this._px1.fillStyle(0x1a3a5a, 0.7);
    for (let x = 0; x < W; x += 80) {
      const h = 80 + Math.sin(x / 200) * 40 + Math.sin(x / 50) * 20;
      this._px1.fillRect(x, H * 2.5 - h, 80, h);
    }

    // Mid hills
    this._px2.clear();
    this._px2.fillStyle(0x1a4a1a, 0.8);
    for (let x = 0; x < W; x += 48) {
      const h = 50 + Math.sin(x / 100 + 1) * 30;
      this._px2.fillRect(x, H * 2.5 - h, 48, h);
    }

    // Near bushes
    this._px3.clear();
    this._px3.fillStyle(0x2a5a2a, 0.9);
    for (let x = 0; x < W; x += 32) {
      const h = 20 + Math.sin(x / 60 + 2) * 10;
      this._px3.fillRect(x, H * 2.5 - h, 32, h);
    }
  }

  _updateSky() {
    const color = Phaser.Display.Color.HexStringToColor(this.timeSystem.skyColor);
    this._skyBg.setFillStyle(color.color);
  }

  // ─── World events ─────────────────────────────────────────────────────────

  _onTileChanged(tx, ty) {
    this.chunkRenderer.markDirty(tx, ty);
  }

  _onPlayerDied() {
    // Drop all items
    const drops = this.inventory.dropAll();
    for (const d of drops) {
      this.spawnDrop(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, d.itemId, d.count);
    }
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOver');
      this.scene.stop('HUDScene');
    });
  }

  // ─── HUD emit ────────────────────────────────────────────────────────────

  _emitHUD() {
    const p = this.player;
    this.registry.set('hudState', {
      hp:          p.hp,
      maxHp:       p.maxHp,
      hunger:      p.hunger,
      maxHunger:   p.maxHunger,
      oxygen:      p.oxygen,
      inWater:     p.inWater,
      hotbar:      this.inventory.hotbar.slice(),
      hotbarIndex: this.inventory.hotbarIndex,
      time:        this.timeSystem.hourString,
      isNight:     this.timeSystem.isNight,
    });
  }

  // ─── Save / Load ─────────────────────────────────────────────────────────

  _autoSave() {
    const p = this.player;
    const state = {
      seed: this.worldSeed,
      player: { x: p.x, y: p.y, hp: p.hp, hunger: p.hunger },
      inventory: this.inventory.serialize(),
      time: this.timeSystem.serialize(),
      chunks: this._serializeModifiedChunks(),
    };
    this.saveManager.autoSave(state);
  }

  _serializeModifiedChunks() {
    // Only save chunks that differ from pure generation
    // For performance, we skip this in the first version
    return {};
  }

  _loadChunkData(chunks) {
    // Restore modified chunk data
  }

  // ─── Hint system ─────────────────────────────────────────────────────────

  _showHint(itemId) {
    if (this._shownHints.has(itemId)) return;
    this._shownHints.add(itemId);
    localStorage.setItem('forge_hints', JSON.stringify([...this._shownHints]));

    const hints = {
      oak_log:    'You got wood! Craft planks (open inventory).',
      coal:       'Coal! Craft torches to light the dark.',
      iron_ore:   'Iron ore! Smelt it in a furnace.',
      diamond:    '💎 Diamond! The finest material!',
      cobblestone:'Stone! Craft stone tools now.',
    };
    const msg = hints[itemId];
    if (!msg) return;

    const W = GAME_WIDTH;
    const txt = this.add.text(W / 2, 80, msg, {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#000000aa', padding: { x: 10, y: 6 },
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: txt, alpha: 0, y: 60,
      delay: 3000, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }
}

function _weightedPick(table) {
  const total = table.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) {
    r -= e.w;
    if (r <= 0) return e.id;
  }
  return table[table.length - 1].id;
}
