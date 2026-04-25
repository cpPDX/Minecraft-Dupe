import { PLAYER, TILES, TILE_SIZE } from '../utils/constants.js';
import { TileRegistry } from '../utils/TileRegistry.js';

const COYOTE_FRAMES = 6;
const BREAK_DEPTHS  = [0, 0, 1, 2, 4, 8]; // pickaxe tier 0-4 speed multiplier index

export class Player {
  constructor(scene, x, y, inventory) {
    this.scene     = scene;
    this.inventory = inventory;

    // Position is top-left of bounding box
    this.x  = x - PLAYER.WIDTH / 2;
    this.y  = y;
    this.vx = 0;
    this.vy = 0;

    this.w = PLAYER.WIDTH;
    this.h = PLAYER.HEIGHT;

    // State
    this.onGround    = false;
    this.onWall      = false;
    this.facingRight = true;
    this.coyote      = 0;
    this.jumpBuffer  = 0;

    // Survival
    this.hp         = PLAYER.MAX_HP;
    this.maxHp      = PLAYER.MAX_HP;
    this.hunger     = PLAYER.MAX_HUNGER;
    this.maxHunger  = PLAYER.MAX_HUNGER;
    this.oxygen     = 10;    // seconds
    this.inWater    = false;
    this.onFire     = false;
    this.fireTicks  = 0;

    this.lastDamageTime = -5000;
    this.invincibleUntil = 0;
    this.dead        = false;

    // Fall tracking
    this.fallStartY = y;

    // Block breaking
    this.breakTarget  = null;   // { tx, ty }
    this.breakProgress = 0;     // 0..1
    this.breakTime    = 0;      // total ms needed

    // Hunger drain
    this._hungerTimer = 0;
    this._activityTimer = 0;

    // Respawn point
    this.spawnX = x;
    this.spawnY = y;

    this._buildSprite();
    this._buildBreakOverlay();
  }

  _buildSprite() {
    const texKey = 'player';
    if (!this.scene.textures.exists(texKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 12; canvas.height = 28;
      const ctx = canvas.getContext('2d');
      _drawPlayer(ctx);
      this.scene.textures.addCanvas(texKey, canvas);
    }
    this.sprite = this.scene.add.image(0, 0, texKey).setOrigin(0, 0).setDepth(10);
    this._syncSprite();
  }

  _buildBreakOverlay() {
    this.breakGfx = this.scene.add.graphics().setDepth(12);
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  update(time, delta, input) {
    if (this.dead) return;
    const dt = delta / 1000;
    const world = this.scene.world;

    this._handleMovement(input, dt, world);
    this._handleEnvironment(dt, world, time);
    this._handleHunger(dt, input);
    this._handleBreaking(input, dt, world, time);
    this._syncSprite();
  }

  _handleMovement(input, dt, world) {
    const onG = this.onGround;

    // Horizontal
    const speed = (input.sprint && this.hunger > 3) ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED;
    let targetVx = 0;
    if (input.left)  { targetVx = -speed; this.facingRight = false; }
    if (input.right) { targetVx =  speed; this.facingRight = true;  }

    this.vx = targetVx;

    // Jump
    if (this.coyote > 0) {
      if (input.jumpJustPressed) {
        this.vy = PLAYER.JUMP_VEL;
        this.coyote = 0;
      }
    }
    if (input.jumpJustPressed && this.vy > 0) this.jumpBuffer = 8;
    if (this.jumpBuffer > 0 && this.onGround) {
      this.vy = PLAYER.JUMP_VEL;
      this.jumpBuffer = 0;
    }

    // Gravity
    if (this.inWater) {
      this.vy += PLAYER.GRAVITY * 0.3 * dt;
      this.vy = Math.max(this.vy, -100);
      if (input.up) this.vy = Math.max(this.vy - 60, -120);
    } else {
      this.vy += PLAYER.GRAVITY * dt;
    }
    if (this.vy > PLAYER.MAX_FALL) this.vy = PLAYER.MAX_FALL;

    // Move
    const res = world.moveAndCollide(this.x, this.y, this.w, this.h, this.vx, this.vy, dt);
    const prevY = this.y;

    if (!this.onGround && res.onGround) {
      // Landing — calculate fall damage using the *landing* y position
      const fallTiles = (res.y - this.fallStartY) / TILE_SIZE;
      if (fallTiles > 4) {
        const dmg = Math.floor(fallTiles - 4);
        this.takeDamage(dmg, Date.now());
      }
    }
    // Track fallStartY as the highest (min Y) point since leaving ground
    if (!res.onGround) {
      if (this.onGround) this.fallStartY = this.y; // just left ground
      else this.fallStartY = Math.min(this.fallStartY, res.y); // track apex
    }

    this.x  = res.x;
    this.y  = res.y;
    this.vy = res.vy;
    this.vx = res.vx;
    this.onGround = res.onGround;
    this.onWall   = res.onWall;

    if (this.onGround) { this.coyote = COYOTE_FRAMES; this.fallStartY = this.y; }
    else if (this.coyote > 0) this.coyote--;
  }

  _handleEnvironment(dt, world, time) {
    const tx = Math.floor((this.x + this.w / 2) / TILE_SIZE);
    const ty = Math.floor((this.y + this.h / 2) / TILE_SIZE);

    const tileAtFeet = world.getTile(tx, ty);
    const tileAtHead = world.getTile(tx, Math.floor(this.y / TILE_SIZE));

    // Water
    this.inWater = (tileAtFeet === TILES.WATER || tileAtHead === TILES.WATER);
    if (this.inWater) {
      this.oxygen = Math.max(0, this.oxygen - dt);
      if (this.oxygen <= 0) this.takeDamage(2 * dt, time);
    } else {
      this.oxygen = Math.min(10, this.oxygen + dt * 2);
    }

    // Lava
    if (tileAtFeet === TILES.LAVA || tileAtHead === TILES.LAVA) {
      this.onFire = true;
      this.fireTicks = 100;
    }
    if (this.onFire) {
      this.takeDamage(4 * dt, time);
      this.fireTicks -= dt * 20;
      if (this.fireTicks <= 0) this.onFire = false;
      if (this.inWater) { this.onFire = false; this.fireTicks = 0; }
    }

    // Cactus
    const tileRight = world.getTile(Math.floor((this.x + this.w) / TILE_SIZE), ty);
    const tileLeft  = world.getTile(Math.floor(this.x / TILE_SIZE) - 1, ty);
    if (tileRight === TILES.CACTUS || tileLeft === TILES.CACTUS) {
      this.takeDamage(1 * dt, time);
    }

    // Health regen
    if (this.hunger > 6 && time - this.lastDamageTime > 5000) {
      this._regenTimer = (this._regenTimer || 0) + dt;
      if (this._regenTimer >= 3) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this._regenTimer = 0;
      }
    } else {
      this._regenTimer = 0;
    }

    // Starvation
    if (this.hunger <= 0) this.takeDamage(1 * dt, time);
  }

  _handleHunger(dt, input) {
    this._hungerTimer += dt;
    let drainRate = 60; // passive: 1 per 60s

    if (input.left || input.right) drainRate = 30;
    if (input.sprint) drainRate = 15;

    if (this._hungerTimer >= drainRate) {
      this._hungerTimer = 0;
      this.hunger = Math.max(0, this.hunger - 1);
    }
  }

  _handleBreaking(input, dt, world, time) {
    if (!input.breakHeld || !input.aimTile) {
      this.breakTarget  = null;
      this.breakProgress = 0;
      this.breakGfx.clear();
      return;
    }

    const { tx, ty } = input.aimTile;
    const tileId  = world.getTile(tx, ty);
    const tileDef = TileRegistry.get(tileId);

    if (tileId === TILES.AIR || tileDef.hardness < 0) {
      this.breakTarget  = null;
      this.breakProgress = 0;
      this.breakGfx.clear();
      return;
    }

    // Reset if target changed
    if (!this.breakTarget || this.breakTarget.tx !== tx || this.breakTarget.ty !== ty) {
      this.breakTarget   = { tx, ty };
      this.breakProgress = 0;
      this.breakTime     = this._calcBreakTime(tileDef);
    }

    this.breakProgress += dt / (this.breakTime / 1000);

    // Draw crack overlay
    this._drawCrack(tx, ty, this.breakProgress);

    if (this.breakProgress >= 1) {
      this._breakBlock(tx, ty, tileId, tileDef, world);
      this.breakTarget   = null;
      this.breakProgress = 0;
      this.breakGfx.clear();
    }
  }

  _calcBreakTime(tileDef) {
    // Base time in ms per hardness point; tool reduces it
    const baseMsPerHardness = 400;
    let hardness = tileDef.hardness;
    const heldItem = this.inventory.getHotbarItem(this.inventory.hotbarIndex);
    if (heldItem) {
      const def = heldItem.def;
      if (def.toolType === tileDef.tool) {
        const bonus = [1, 0.75, 0.5, 0.4, 0.3][Math.min(4, def.toolTier || 0)];
        return Math.max(100, hardness * baseMsPerHardness * bonus);
      }
      // Wrong tool: 5× penalty
      return hardness * baseMsPerHardness * 5;
    }
    return hardness * baseMsPerHardness;
  }

  _drawCrack(tx, ty, progress) {
    this.breakGfx.clear();
    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;
    const stages = Math.floor(progress * 8);
    const alpha  = 0.15 + progress * 0.5;
    this.breakGfx.fillStyle(0x000000, alpha);
    this.breakGfx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    // Crack lines
    this.breakGfx.lineStyle(1, 0x000000, alpha + 0.2);
    for (let i = 0; i < stages; i++) {
      const x0 = px + 2 + i * 2; const y0 = py + 2 + i;
      this.breakGfx.lineBetween(x0, y0, x0 + 4, y0 + 4);
    }
  }

  _breakBlock(tx, ty, tileId, tileDef, world) {
    world.setTile(tx, ty, TILES.AIR);
    // Spawn drops
    const drops = tileDef.drops;
    for (const drop of drops) {
      if (drop.chance && Math.random() > drop.chance) continue;
      for (let i = 0; i < drop.count; i++) {
        this.scene.spawnDrop(tx * TILE_SIZE + 8, ty * TILE_SIZE + 8, drop.itemId);
      }
    }
    // Durability
    const held = this.inventory.getHotbarItem(this.inventory.hotbarIndex);
    if (held && held.def.durability !== null) {
      held.durability--;
      if (held.durability <= 0) {
        this.inventory.setHotbarItem(this.inventory.hotbarIndex, null);
        this.scene.events.emit('hotbarChanged');
      }
    }
    this.scene.events.emit('tileChanged', tx, ty);
  }

  // ─── Damage / death ───────────────────────────────────────────────────────

  takeDamage(amount, time) {
    if (time < this.invincibleUntil) return;
    this.hp = Math.max(0, this.hp - amount);
    this.lastDamageTime = time;
    if (typeof time === 'number' && amount >= 1) this.invincibleUntil = time + 500;
    this.scene.events.emit('healthChanged', this.hp);
    if (this.hp <= 0 && !this.dead) this._die();
  }

  _die() {
    this.dead = true;
    this.scene.events.emit('playerDied');
  }

  eat(itemId, hungerRestore) {
    this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestore);
    this.scene.events.emit('hungerChanged', this.hunger);
  }

  // ─── Sprite sync ─────────────────────────────────────────────────────────

  _syncSprite() {
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.setFlipX(!this.facingRight);
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  get tileX()   { return Math.floor(this.centerX / TILE_SIZE); }
  get tileY()   { return Math.floor(this.centerY / TILE_SIZE); }

  destroy() {
    this.sprite.destroy();
    this.breakGfx.destroy();
  }
}

// ─── Procedural player sprite ─────────────────────────────────────────────────

function _drawPlayer(ctx) {
  // Head
  ctx.fillStyle = '#f0c890'; ctx.fillRect(1, 0, 10, 10);
  ctx.fillStyle = '#d0a870'; ctx.fillRect(1, 8,  10, 2);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(3, 3, 2, 3); ctx.fillRect(7, 3, 2, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 3, 1, 1); ctx.fillRect(7, 3, 1, 1);
  // Shirt
  ctx.fillStyle = '#4a7acc'; ctx.fillRect(1, 10, 10, 10);
  ctx.fillStyle = '#3a5aaa'; ctx.fillRect(1, 10, 2, 10); ctx.fillRect(9, 10, 2, 10);
  ctx.fillStyle = '#2a4a88'; ctx.fillRect(2, 10, 1, 10); ctx.fillRect(9, 10, 1, 10);
  // Belt
  ctx.fillStyle = '#8b6914'; ctx.fillRect(1, 19, 10, 2);
  ctx.fillStyle = '#ffd700'; ctx.fillRect(5, 19, 2, 2);
  // Pants
  ctx.fillStyle = '#3a4a6a'; ctx.fillRect(1, 21, 4, 5); ctx.fillRect(7, 21, 4, 5);
  ctx.fillStyle = '#2a3a5a'; ctx.fillRect(1, 21, 1, 5); ctx.fillRect(10, 21, 1, 5);
  // Shoes
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 26, 5, 2); ctx.fillRect(7, 26, 5, 2);
}
