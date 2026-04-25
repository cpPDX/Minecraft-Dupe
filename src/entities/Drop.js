import { ItemRegistry } from '../utils/ItemRegistry.js';
import { TILE_SIZE } from '../utils/constants.js';

const GRAVITY      = 300;
const BOUNCE_DAMP  = 0.4;
const PICKUP_DIST  = TILE_SIZE * 2;
const ATTRACT_DIST = TILE_SIZE * 4;
const LIFETIME_MS  = 60000; // 1 minute

export class Drop {
  constructor(scene, x, y, itemId, count = 1) {
    this.scene  = scene;
    this.x      = x;
    this.y      = y;
    this.vx     = (Math.random() - 0.5) * 60;
    this.vy     = -80 - Math.random() * 40;
    this.itemId = itemId;
    this.count  = count;

    this.w = 8;
    this.h = 8;

    this.onGround  = false;
    this.age       = 0;
    this.collected = false;

    this.sprite = scene.add.graphics().setDepth(8);
    this._draw();
  }

  _draw() {
    this.sprite.clear();
    const def = ItemRegistry.get(this.itemId);
    const color = def ? parseInt(def.color.replace('#', ''), 16) : 0xaaaaaa;
    // Pulsing outline
    this.sprite.lineStyle(1, 0xffffff, 0.8);
    this.sprite.strokeRect(this.x - 4, this.y - 4, 8, 8);
    this.sprite.fillStyle(color, 1);
    this.sprite.fillRect(this.x - 3, this.y - 3, 6, 6);
    // Inner highlight
    this.sprite.fillStyle(0xffffff, 0.3);
    this.sprite.fillRect(this.x - 2, this.y - 2, 2, 2);
  }

  update(delta, world, player) {
    if (this.collected) return;
    const dt = delta / 1000;
    this.age += delta;
    if (this.age > LIFETIME_MS) { this.destroy(); return; }

    // Attract toward player when close
    const dx = player.centerX - this.x;
    const dy = player.centerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ATTRACT_DIST) {
      const spd = 180;
      this.vx += (dx / dist) * spd * dt * 3;
      this.vy += (dy / dist) * spd * dt * 3;
    }

    // Pickup
    if (dist < PICKUP_DIST) {
      this.scene.collectDrop(this);
      return;
    }

    // Gravity
    if (!this.onGround) this.vy = Math.min(this.vy + GRAVITY * dt, 400);

    // X movement
    this.x += this.vx * dt;
    const txR = Math.floor((this.x + 4) / TILE_SIZE);
    const txL = Math.floor((this.x - 4) / TILE_SIZE);
    const ty  = Math.floor(this.y / TILE_SIZE);
    if (this.vx > 0 && world.isSolid(txR, ty)) { this.x = txR * TILE_SIZE - 4; this.vx *= -0.3; }
    if (this.vx < 0 && world.isSolid(txL, ty)) { this.x = (txL + 1) * TILE_SIZE + 4; this.vx *= -0.3; }

    // Y movement
    this.y += this.vy * dt;
    const tyB  = Math.floor((this.y + 4) / TILE_SIZE);
    const tx2  = Math.floor(this.x / TILE_SIZE);
    if (this.vy > 0 && world.isSolid(tx2, tyB)) {
      this.y = tyB * TILE_SIZE - 4;
      this.vy *= -BOUNCE_DAMP;
      this.vx *= 0.85;
      this.onGround = Math.abs(this.vy) < 10;
      if (this.onGround) this.vy = 0;
    } else {
      this.onGround = false;
    }

    // Dampen
    if (this.onGround) this.vx *= 0.92;

    this._draw();
  }

  destroy() {
    this.collected = true;
    this.sprite.destroy();
  }
}
