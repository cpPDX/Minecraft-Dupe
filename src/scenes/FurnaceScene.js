import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants.js';
import { RecipeRegistry } from '../utils/RecipeRegistry.js';

export class FurnaceScene extends Phaser.Scene {
  constructor() { super('FurnaceScene'); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const inv = this.gameScene.inventory;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setScrollFactor(0).setDepth(300);

    const panelW = 420, panelH = 340;
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    const panel = this.add.graphics().setScrollFactor(0).setDepth(301);
    panel.fillStyle(0x1a1a2a, 0.97);
    panel.fillRoundedRect(px, py, panelW, panelH, 8);
    panel.lineStyle(2, 0x888888, 0.8);
    panel.strokeRoundedRect(px, py, panelW, panelH, 8);

    this.add.text(W / 2, py + 16, 'Furnace', {
      fontSize: '22px', color: '#ff9900', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(302);

    const close = this.add.text(px + panelW - 16, py + 16, '✕', {
      fontSize: '18px', color: '#ff4444',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(302).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    // List smelt recipes
    const recipes = RecipeRegistry.getAll().filter(r => r.station === 'furnace');
    const listX = px + 20, listY = py + 56;

    this.add.text(listX, listY, 'Smelt Recipes:', {
      fontSize: '13px', color: '#888888',
    }).setScrollFactor(0).setDepth(302);

    recipes.forEach((recipe, idx) => {
      const y = listY + 24 + idx * 44;
      const canSmelt = inv.countItem(recipe.input.itemId) >= recipe.input.count &&
                       inv.countItem(recipe.fuel.itemId)  >= recipe.fuel.count;

      const gfx = this.add.graphics().setScrollFactor(0).setDepth(302);
      gfx.fillStyle(canSmelt ? 0x2a3a2a : 0x2a2a2a, 0.7);
      gfx.fillRoundedRect(listX, y, panelW - 40, 38, 4);

      const label = `${recipe.input.itemId.replace(/_/g,'  ')} + ${recipe.fuel.itemId} → ${recipe.result.itemId.replace(/_/g,' ')}`;
      this.add.text(listX + 10, y + 10, label, {
        fontSize: '12px', color: canSmelt ? '#ffffff' : '#666666',
      }).setScrollFactor(0).setDepth(303);

      if (canSmelt) {
        const btnGfx = this.add.graphics().setScrollFactor(0).setDepth(303);
        const bx = listX + panelW - 80, by = y + 6;
        btnGfx.fillStyle(0xff8800, 0.9);
        btnGfx.fillRoundedRect(bx, by, 58, 26, 4);
        this.add.text(bx + 29, by + 13, 'SMELT', {
          fontSize: '11px', color: '#fff', fontStyle: 'bold',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(304);

        const zone = this.add.zone(bx, by, 58, 26).setOrigin(0)
          .setScrollFactor(0).setDepth(305).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          inv.removeItem(recipe.input.itemId, recipe.input.count);
          inv.removeItem(recipe.fuel.itemId,  recipe.fuel.count);
          inv.addItem(recipe.result.itemId,   recipe.result.count);
          this.scene.restart({ gameScene: this.gameScene });
        });
      }
    });

    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) escKey.on('down', () => this.scene.stop());
  }
}
