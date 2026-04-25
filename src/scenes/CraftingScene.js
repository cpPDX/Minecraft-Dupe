import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants.js';

export class CraftingScene extends Phaser.Scene {
  constructor() { super('CraftingScene'); }

  init(data) {
    this.gameScene = data.gameScene;
    this.station   = data.station ?? 'crafting_table';
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const inv      = this.gameScene.inventory;
    const crafting = this.gameScene.crafting;

    // Dim overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setScrollFactor(0).setDepth(300);

    // Panel
    const panelW = 600, panelH = 420;
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    const panel = this.add.graphics().setScrollFactor(0).setDepth(301);
    panel.fillStyle(0x1a1a2a, 0.97);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    panel.lineStyle(2, 0x8b4513, 0.9);
    panel.strokeRoundedRect(px, py, panelW, panelH, 8);

    // Title
    const stationName = this.station === 'crafting_table' ? 'Crafting Table' : 'Furnace';
    this.add.text(W / 2, py + 16, stationName, {
      fontSize: '22px', color: '#ffcc88', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(302);

    // Close
    const close = this.add.text(px + panelW - 16, py + 16, '✕', {
      fontSize: '18px', color: '#ff4444',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(302).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    // Recipe list
    const available = crafting.getAvailable(this.station);
    const listX = px + 16, listY = py + 54;
    const listH = panelH - 70;

    this.add.text(listX, listY - 2, 'Available Recipes:', {
      fontSize: '13px', color: '#888888',
    }).setScrollFactor(0).setDepth(302);

    // Scrollable recipe list (simple, no scroll for MVP)
    const maxVisible = Math.floor((listH - 30) / 48);
    const shown = available.slice(0, maxVisible);

    shown.forEach((recipe, idx) => {
      this._drawRecipe(recipe, listX, listY + 22 + idx * 50, px, py, panelW, panelH, crafting, inv);
    });

    if (available.length === 0) {
      this.add.text(W / 2, py + H / 4, 'No recipes available.\nGather more materials!', {
        fontSize: '16px', color: '#666688', align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(302);
    }

    // ESC / E closes
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) escKey.on('down', () => this.scene.stop());
  }

  _drawRecipe(recipe, x, y, px, py, panelW, panelH, crafting, inv) {
    const resultDef = inv.constructor ? null : null;
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(302);

    // Row bg
    gfx.fillStyle(0x2a2a3a, 0.7);
    gfx.fillRoundedRect(x, y, panelW - 32, 44, 4);

    // Result color swatch
    const resultItem = this.gameScene.inventory; // placeholder
    const color = 0xaaaaaa; // default
    gfx.fillStyle(color, 1);
    gfx.fillRect(x + 4, y + 8, 28, 28);

    // Recipe name
    this.add.text(x + 40, y + 6, recipe.result.itemId.replace(/_/g, ' ').toUpperCase(), {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(303);

    // Ingredients summary
    let ingLine = '';
    if (recipe.type === 'shaped') {
      const totals = {};
      for (const row of recipe.pattern) for (const cell of row) if (cell) totals[cell] = (totals[cell] || 0) + 1;
      ingLine = Object.entries(totals).map(([k, v]) => `${v}×${k.replace(/_/g, ' ')}`).join(', ');
    } else if (recipe.type === 'shapeless') {
      ingLine = recipe.ingredients.map(i => `${i.count}×${i.itemId.replace(/_/g, ' ')}`).join(', ');
    }
    this.add.text(x + 40, y + 23, ingLine, {
      fontSize: '11px', color: '#888888',
    }).setScrollFactor(0).setDepth(303);

    // Count result
    this.add.text(x + panelW - 56, y + 6, `→ ${recipe.result.count}`, {
      fontSize: '14px', color: '#ffcc44',
    }).setScrollFactor(0).setDepth(303);

    // Craft button
    const btnX = x + panelW - 100, btnY = y + 8;
    const btnGfx = this.add.graphics().setScrollFactor(0).setDepth(303);
    btnGfx.fillStyle(0x44aa44, 0.9);
    btnGfx.fillRoundedRect(btnX, btnY, 60, 28, 4);
    const btnLbl = this.add.text(btnX + 30, btnY + 14, 'CRAFT', {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(304);

    const zone = this.add.zone(btnX, btnY, 60, 28).setOrigin(0)
      .setScrollFactor(0).setDepth(305).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (crafting.craft(recipe.id)) {
        // Flash feedback
        btnGfx.clear();
        btnGfx.fillStyle(0x88ff88, 1);
        btnGfx.fillRoundedRect(btnX, btnY, 60, 28, 4);
        this.time.delayedCall(200, () => {
          this.scene.restart({ gameScene: this.gameScene, station: this.station });
        });
      } else {
        btnGfx.clear();
        btnGfx.fillStyle(0xff4444, 1);
        btnGfx.fillRoundedRect(btnX, btnY, 60, 28, 4);
        this.time.delayedCall(300, () => {
          btnGfx.clear();
          btnGfx.fillStyle(0x44aa44, 0.9);
          btnGfx.fillRoundedRect(btnX, btnY, 60, 28, 4);
        });
      }
    });
  }
}
