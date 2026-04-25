import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HOTBAR_SIZE, INV_ROWS, INV_COLS } from '../utils/constants.js';

const SLOT_SIZE = 44;
const PAD       = 4;

export class InventoryScene extends Phaser.Scene {
  constructor() { super('InventoryScene'); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const inv = this.gameScene.inventory;

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setScrollFactor(0).setDepth(300);

    // Panel
    const panelW = INV_COLS * (SLOT_SIZE + PAD) + PAD + 20;
    const panelH = (INV_ROWS + 1) * (SLOT_SIZE + PAD) + PAD + 80;
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    const panel = this.add.graphics().setScrollFactor(0).setDepth(301);
    panel.fillStyle(0x1a1a2a, 0.95);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    panel.lineStyle(2, 0x4466aa, 0.8);
    panel.strokeRoundedRect(px, py, panelW, panelH, 8);

    // Title
    this.add.text(W / 2, py + 16, 'Inventory', {
      fontSize: '20px', color: '#aaccff', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(302);

    // Close button
    const closeBtn = this.add.text(px + panelW - 16, py + 16, '✕', {
      fontSize: '18px', color: '#ff4444',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(302).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.stop());

    // Main grid
    const gridY = py + 50;
    this._slots = [];
    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
        const i  = row * INV_COLS + col;
        const sx = px + 10 + col * (SLOT_SIZE + PAD);
        const sy = gridY + row * (SLOT_SIZE + PAD);
        this._makeSlot(sx, sy, i, 'main', inv);
      }
    }

    // Hotbar row
    const hotbarY = gridY + INV_ROWS * (SLOT_SIZE + PAD) + 20;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const sx = px + 10 + i * (SLOT_SIZE + PAD);
      this._makeSlot(sx, hotbarY, i, 'hotbar', inv);
    }

    // Close on ESC or E
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const eKey   = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    if (escKey) escKey.on('down', () => this.scene.stop());
    if (eKey)   eKey.on('down',   () => this.scene.stop());
  }

  _makeSlot(x, y, index, pool, inv) {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(302);
    gfx.fillStyle(0x2a2a3a, 0.9);
    gfx.fillRect(x, y, SLOT_SIZE, SLOT_SIZE);
    gfx.lineStyle(1, 0x444466, 0.7);
    gfx.strokeRect(x, y, SLOT_SIZE, SLOT_SIZE);

    const item = pool === 'hotbar' ? inv.hotbar[index] : inv.main[index];
    if (!item) return;

    const color = parseInt((item.def?.color ?? '#aaaaaa').replace('#', ''), 16);
    const pad   = 6;
    gfx.fillStyle(color, 1);
    gfx.fillRect(x + pad, y + pad, SLOT_SIZE - pad * 2, SLOT_SIZE - pad * 2);

    if (item.count > 1) {
      this.add.text(x + SLOT_SIZE - 2, y + SLOT_SIZE - 2, String(item.count), {
        fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1).setScrollFactor(0).setDepth(303);
    }

    // Tooltip on hover
    const zone = this.add.zone(x, y, SLOT_SIZE, SLOT_SIZE)
      .setScrollFactor(0).setDepth(304).setInteractive({ useHandCursor: true })
      .setOrigin(0);

    let tooltip = null;
    zone.on('pointerover', () => {
      tooltip = this.add.text(x + SLOT_SIZE, y, item.def.name, {
        fontSize: '12px', color: '#ffffff',
        backgroundColor: '#000000cc', padding: { x: 6, y: 4 },
      }).setScrollFactor(0).setDepth(400);
    });
    zone.on('pointerout', () => { if (tooltip) { tooltip.destroy(); tooltip = null; } });
    zone.on('pointerdown', () => {
      // Move to hotbar if clicking main inv
      if (pool === 'main') {
        const leftover = inv.addItem(item.itemId, item.count);
        if (leftover === 0) {
          inv.main[index] = null;
          this.scene.restart({ gameScene: this.gameScene });
        }
      }
    });
  }
}
