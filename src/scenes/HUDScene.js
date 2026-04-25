import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HOTBAR_SIZE } from '../utils/constants.js';

const SLOT_SIZE = 44;
const SLOT_PAD  = 4;

export class HUDScene extends Phaser.Scene {
  constructor() { super('HUDScene'); }

  create() {
    this._buildHearts();
    this._buildHunger();
    this._buildHotbar();
    this._buildOxygen();
    this._buildTimeDisplay();

    // Poll game state
    this.time.addEvent({ delay: 100, loop: true, callback: this._refresh, callbackScope: this });
  }

  // ─── Build HUD elements ──────────────────────────────────────────────────

  _buildHearts() {
    const W = GAME_WIDTH;
    this._hearts = [];
    for (let i = 0; i < 10; i++) {
      const x = 14 + i * 20, y = 14;
      const h = this.add.graphics().setScrollFactor(0).setDepth(150);
      _drawHeart(h, x, y, true);
      this._hearts.push(h);
    }
  }

  _buildHunger() {
    this._hungerIcons = [];
    for (let i = 0; i < 10; i++) {
      const x = GAME_WIDTH - 14 - i * 20, y = 14;
      const h = this.add.graphics().setScrollFactor(0).setDepth(150);
      _drawDrumstick(h, x, y, true);
      this._hungerIcons.push(h);
    }
  }

  _buildHotbar() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const totalW = HOTBAR_SIZE * (SLOT_SIZE + SLOT_PAD) - SLOT_PAD;
    const startX = (W - totalW) / 2;
    const y      = H - SLOT_SIZE - 10;

    this._hotbarGfx = this.add.graphics().setScrollFactor(0).setDepth(150);
    this._hotbarLabels = [];
    this._hotbarSlots  = [];

    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx = startX + i * (SLOT_SIZE + SLOT_PAD);
      const slot = {
        x: sx, y, w: SLOT_SIZE, h: SLOT_SIZE,
        itemGfx:  this.add.graphics().setScrollFactor(0).setDepth(151),
        countTxt: this.add.text(sx + SLOT_SIZE - 2, y + SLOT_SIZE - 2, '', {
          fontSize: '11px', color: '#ffffff',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1).setScrollFactor(0).setDepth(152),
      };
      this._hotbarSlots.push(slot);
    }
  }

  _buildOxygen() {
    this._oxyBar = this.add.graphics().setScrollFactor(0).setDepth(150);
    this._oxyBar.setVisible(false);
  }

  _buildTimeDisplay() {
    this._timeTxt = this.add.text(GAME_WIDTH / 2, 8, '12:00', {
      fontSize: '13px', color: '#ffffcc',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(150);
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────

  _refresh() {
    const state = this.registry.get('hudState');
    if (!state) return;

    this._refreshHearts(state.hp, state.maxHp);
    this._refreshHunger(state.hunger, state.maxHunger);
    this._refreshHotbar(state.hotbar, state.hotbarIndex);
    this._refreshOxygen(state.oxygen, state.inWater);
    this._timeTxt.setText(state.time);
    this._timeTxt.setColor(state.isNight ? '#aaccff' : '#ffffcc');
  }

  _refreshHearts(hp, maxHp) {
    for (let i = 0; i < 10; i++) {
      const h = this._hearts[i];
      h.clear();
      const val = Math.max(0, Math.min(1, (hp - i * 2) / 2));
      _drawHeart(h, 14 + i * 20, 14, val > 0.5, val > 0 && val <= 0.5);
    }
  }

  _refreshHunger(hunger, maxHunger) {
    for (let i = 0; i < 10; i++) {
      const h = this._hungerIcons[i];
      h.clear();
      const val = Math.max(0, Math.min(1, (hunger - i * 2) / 2));
      _drawDrumstick(h, GAME_WIDTH - 14 - i * 20, 14, val > 0.5, val > 0 && val <= 0.5);
    }
  }

  _refreshHotbar(hotbar, selected) {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const totalW = HOTBAR_SIZE * (SLOT_SIZE + SLOT_PAD) - SLOT_PAD;
    const startX = (W - totalW) / 2;
    const y      = H - SLOT_SIZE - 10;

    this._hotbarGfx.clear();

    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx   = startX + i * (SLOT_SIZE + SLOT_PAD);
      const isSelected = i === selected;

      // Slot background
      this._hotbarGfx.fillStyle(isSelected ? 0x888888 : 0x333333, isSelected ? 0.9 : 0.7);
      this._hotbarGfx.fillRect(sx, y, SLOT_SIZE, SLOT_SIZE);
      this._hotbarGfx.lineStyle(2, isSelected ? 0xffffff : 0x666666, isSelected ? 0.9 : 0.5);
      this._hotbarGfx.strokeRect(sx, y, SLOT_SIZE, SLOT_SIZE);

      // Item
      const slot = this._hotbarSlots[i];
      const item  = hotbar?.[i] ?? null;

      slot.itemGfx.clear();
      slot.countTxt.setText('');

      if (item) {
        const color = parseInt((item.def?.color ?? '#aaaaaa').replace('#', ''), 16);
        const pad = 6;
        slot.itemGfx.fillStyle(color, 1);
        slot.itemGfx.fillRect(sx + pad, y + pad, SLOT_SIZE - pad * 2, SLOT_SIZE - pad * 2);
        // Highlight
        slot.itemGfx.fillStyle(0xffffff, 0.2);
        slot.itemGfx.fillRect(sx + pad, y + pad, (SLOT_SIZE - pad * 2) / 2, (SLOT_SIZE - pad * 2) / 2);

        if (item.count > 1) slot.countTxt.setText(String(item.count));

        // Durability bar
        if (item.durability !== null && item.def?.maxDurability) {
          const pct = item.durability / item.def.maxDurability;
          const barW = SLOT_SIZE - 8;
          const barY = y + SLOT_SIZE - 6;
          slot.itemGfx.fillStyle(0x000000, 0.8);
          slot.itemGfx.fillRect(sx + 4, barY, barW, 3);
          const durColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
          slot.itemGfx.fillStyle(durColor, 1);
          slot.itemGfx.fillRect(sx + 4, barY, Math.round(barW * pct), 3);
        }
      }
    }

    // Hotbar number labels
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx = startX + i * (SLOT_SIZE + SLOT_PAD);
      this._hotbarGfx.fillStyle(0xffffff, 0.4);
      // small label drawn inline
    }
  }

  _refreshOxygen(oxygen, inWater) {
    this._oxyBar.setVisible(inWater);
    if (!inWater) return;

    const W = GAME_WIDTH;
    const pct = Math.max(0, oxygen / 10);
    const barW = 120;
    const x = W / 2 - barW / 2, y = 40;

    this._oxyBar.clear();
    this._oxyBar.fillStyle(0x003366, 0.7);
    this._oxyBar.fillRoundedRect(x - 2, y - 2, barW + 4, 16, 4);
    this._oxyBar.fillStyle(0x1188ff, 0.9);
    this._oxyBar.fillRoundedRect(x, y, Math.round(barW * pct), 12, 3);
    this._oxyBar.lineStyle(1, 0x4499ff, 0.5);
    this._oxyBar.strokeRoundedRect(x, y, barW, 12, 3);
  }
}

// ─── Icon drawing helpers ─────────────────────────────────────────────────────

function _drawHeart(gfx, cx, cy, full, half = false) {
  if (full) {
    gfx.fillStyle(0xff2222, 1);
  } else if (half) {
    gfx.fillStyle(0xff8888, 1);
  } else {
    gfx.fillStyle(0x444444, 0.6);
  }
  // Pixel heart shape (8px)
  gfx.fillRect(cx - 3, cy - 4, 2, 2); gfx.fillRect(cx + 1, cy - 4, 2, 2);
  gfx.fillRect(cx - 4, cy - 2, 8, 3);
  gfx.fillRect(cx - 3, cy + 1, 6, 2);
  gfx.fillRect(cx - 2, cy + 3, 4, 2);
  gfx.fillRect(cx - 1, cy + 5, 2, 1);
  if (full || half) {
    gfx.fillStyle(0xff8888, 0.5);
    gfx.fillRect(cx - 2, cy - 3, 1, 1);
  }
}

function _drawDrumstick(gfx, cx, cy, full, half = false) {
  const color = full ? 0xd48a2a : half ? 0x8a5a2a : 0x444444;
  const alpha  = full || half ? 0.9 : 0.5;
  gfx.fillStyle(color, alpha);
  gfx.fillRect(cx - 5, cy - 4, 10, 8);
  gfx.fillRect(cx - 2, cy + 4, 4, 4);
  gfx.fillStyle(0xf0c890, alpha);
  gfx.fillRect(cx, cy - 3, 3, 3);
}
