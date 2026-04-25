import { TILES, TILE_SIZE, PLAYER } from '../utils/constants.js';

export class Mob {
  constructor(scene, x, y, def) {
    this.scene    = scene;
    this.x        = x - def.w / 2;
    this.y        = y - def.h;
    this.vx       = 0;
    this.vy       = 0;
    this.w        = def.w;
    this.h        = def.h;

    this.hp       = def.hp;
    this.maxHp    = def.hp;
    this.damage   = def.damage;
    this.speed    = def.speed;
    this.drops    = def.drops;
    this.name     = def.name;
    this.hostile  = def.hostile ?? true;
    this.passive  = def.passive ?? false;

    this.state     = this.passive ? 'idle' : 'idle';
    this.stateTimer = 0;
    this.aiTick     = 0;
    this.attackCooldown = 0;
    this.onGround   = false;
    this.facingRight = true;
    this.dead       = false;
    this.deathTimer = 0;

    this.invincibleUntil = 0;

    // Jump behavior
    this.jumpCooldown = 0;

    this.sprite = scene.add.graphics().setDepth(9);
    this._drawSprite(def);
    this._cachedDef = def;
  }

  _drawSprite(def) {
    this.sprite.clear();
    const x = this.x, y = this.y, w = this.w, h = this.h;

    // Death fade
    const alpha = this.dead ? Math.max(0, 1 - this.deathTimer / 500) : 1;

    this.sprite.fillStyle(parseInt(def.color.replace('#', ''), 16), alpha);
    this.sprite.fillRect(x, y, w, h);

    // Eyes
    const eyeY = y + Math.floor(h * 0.25);
    const eyeSize = Math.max(2, Math.floor(w * 0.12));
    if (this.facingRight) {
      this.sprite.fillStyle(0xffffff, alpha);
      this.sprite.fillRect(x + w - eyeSize * 2 - 1, eyeY, eyeSize, eyeSize);
      this.sprite.fillStyle(0x111111, alpha);
      this.sprite.fillRect(x + w - eyeSize * 2, eyeY, eyeSize - 1, eyeSize - 1);
    } else {
      this.sprite.fillStyle(0xffffff, alpha);
      this.sprite.fillRect(x + 1, eyeY, eyeSize, eyeSize);
      this.sprite.fillStyle(0x111111, alpha);
      this.sprite.fillRect(x + 1, eyeY, eyeSize - 1, eyeSize - 1);
    }

    // HP bar if damaged
    if (this.hp < this.maxHp && !this.dead) {
      const barW = w;
      const filled = Math.round(barW * (this.hp / this.maxHp));
      this.sprite.fillStyle(0x440000, 0.8);
      this.sprite.fillRect(x, y - 4, barW, 3);
      this.sprite.fillStyle(0xff2222, 0.9);
      this.sprite.fillRect(x, y - 4, filled, 3);
    }
  }

  update(delta, world, player, time) {
    if (this.dead) {
      this.deathTimer += delta;
      if (this.deathTimer >= 500) { this.destroy(); return; }
      this._drawSprite(this._cachedDef);
      return;
    }

    const dt = delta / 1000;
    this.aiTick++;
    this.attackCooldown  = Math.max(0, this.attackCooldown  - delta);
    this.jumpCooldown    = Math.max(0, this.jumpCooldown    - delta);

    // AI update every 10 frames
    if (this.aiTick % 10 === 0) this._updateAI(player, world);

    // Physics
    this._applyPhysics(dt, world);
    this._drawSprite(this._cachedDef);

    // Attack
    if (this.hostile && this.attackCooldown <= 0) {
      const dx = player.centerX - (this.x + this.w / 2);
      const dy = player.centerY - (this.y + this.h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < TILE_SIZE * 1.5) {
        player.takeDamage(this.damage, time);
        this.attackCooldown = 1200;
      }
    }
  }

  _updateAI(player, world) {
    const px  = player.centerX;
    const py  = player.centerY;
    const mx  = this.x + this.w / 2;
    const my  = this.y + this.h / 2;
    const dx  = px - mx;
    const dist = Math.abs(dx) + Math.abs(py - my);

    if (this.passive) {
      // Flee from player if close
      if (dist < TILE_SIZE * 4) {
        this.state = 'flee';
        this.vx = dx < 0 ? this.speed : -this.speed;
      } else {
        this.state = 'idle';
        this.vx = 0;
      }
      return;
    }

    // Hostile AI
    if (dist > TILE_SIZE * 20) {
      this.state = 'idle';
      this.vx = (Math.random() - 0.5) * this.speed * 0.3;
    } else if (dist <= TILE_SIZE * 20) {
      this.state = 'pursue';
      this.vx = dx > 0 ? this.speed : -this.speed;
      this.facingRight = dx > 0;

      // Jump over walls
      if (this.onGround && this.jumpCooldown <= 0) {
        const faceX = this.facingRight ? this.x + this.w + 2 : this.x - 2;
        const faceTY = Math.floor((this.y + this.h) / TILE_SIZE);
        if (world.isSolid(Math.floor(faceX / TILE_SIZE), faceTY - 1)) {
          this.vy = -320;
          this.jumpCooldown = 600;
        }
      }
    }
  }

  _applyPhysics(dt, world) {
    this.vy = Math.min(this.vy + 900 * dt, 800);
    const res = world.moveAndCollide(this.x, this.y, this.w, this.h, this.vx, this.vy, dt);
    this.x = res.x; this.y = res.y;
    this.vx = res.vx; this.vy = res.vy;
    this.onGround = res.onGround;
    if (res.onWall) this.vx *= -0.5;
  }

  takeDamage(amount, time) {
    if (time < this.invincibleUntil) return;
    this.hp -= amount;
    this.invincibleUntil = time + 300;
    if (this.hp <= 0) this._die();
  }

  _die() {
    this.dead = true;
    for (const drop of this.drops) {
      if (drop.chance && Math.random() > drop.chance) continue;
      const count = drop.count || 1;
      for (let i = 0; i < count; i++) {
        this.scene.spawnDrop(this.x + this.w / 2, this.y + this.h / 2, drop.itemId);
      }
    }
    this.scene.events.emit('mobDied', this);
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  destroy() {
    this.sprite.destroy();
  }
}

// ─── Mob Definitions ──────────────────────────────────────────────────────────

export const MOB_DEFS = {
  slime: {
    name: 'Slime', w: 20, h: 20, hp: 8, damage: 2, speed: 40,
    color: '#44ff44', hostile: true,
    drops: [{ itemId: 'slimeball', count: 1 }],
  },
  zombie: {
    name: 'Zombie', w: 12, h: 28, hp: 20, damage: 3, speed: 55,
    color: '#4a8a44', hostile: true,
    drops: [
      { itemId: 'rotten_flesh', count: 1 },
      { itemId: 'iron_ingot',   count: 1, chance: 0.05 },
    ],
  },
  skeleton: {
    name: 'Skeleton', w: 12, h: 26, hp: 16, damage: 2, speed: 65,
    color: '#e8e8cc', hostile: true,
    drops: [
      { itemId: 'bone',  count: 1 },
      { itemId: 'arrow', count: 2 },
    ],
  },
  spider: {
    name: 'Spider', w: 22, h: 14, hp: 14, damage: 2, speed: 80,
    color: '#333333', hostile: true,
    drops: [
      { itemId: 'string',     count: 1 },
      { itemId: 'spider_eye', count: 1, chance: 0.3 },
    ],
  },
  creeper: {
    name: 'Creeper', w: 12, h: 26, hp: 20, damage: 0, speed: 55,
    color: '#2a8a2a', hostile: true,
    drops: [{ itemId: 'gunpowder', count: 1 }],
  },
  pig: {
    name: 'Pig', w: 20, h: 16, hp: 10, damage: 0, speed: 50,
    color: '#f0a080', hostile: false, passive: true,
    drops: [{ itemId: 'raw_pork', count: 1 }],
  },
  rabbit: {
    name: 'Rabbit', w: 10, h: 12, hp: 3, damage: 0, speed: 90,
    color: '#e0c0a0', hostile: false, passive: true,
    drops: [{ itemId: 'raw_meat', count: 1 }],
  },
  lava_slime: {
    name: 'Lava Slime', w: 22, h: 22, hp: 16, damage: 5, speed: 35,
    color: '#ff6600', hostile: true,
    drops: [{ itemId: 'magma_cream', count: 1 }],
  },
};
