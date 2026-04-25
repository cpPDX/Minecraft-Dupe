import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants.js';

export class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // Loading screen
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a14);
    const title = this.add.text(W / 2, H / 2 - 60, 'FORGE', {
      fontSize: '48px', color: '#ff9900', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const sub = this.add.text(W / 2, H / 2 - 15, 'A Survival Adventure', {
      fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(W / 2, H / 2 + 40, 320, 12, 0x222233).setOrigin(0.5);
    const bar   = this.add.rectangle(W / 2 - 160, H / 2 + 40, 0, 10, 0xff9900).setOrigin(0, 0.5);
    const txt   = this.add.text(W / 2, H / 2 + 62, 'Generating world...', {
      fontSize: '13px', color: '#666688',
    }).setOrigin(0.5);

    this.load.on('progress', p => { bar.width = 320 * p; });
    this.load.on('fileprogress', (f) => { txt.setText(`Loading: ${f.key}`); });

    // No external assets to load — we generate everything programmatically.
    // We just do a fake 1-frame delay to show the screen.
  }

  create() {
    // Generate procedural textures then go to main menu
    this._generateTextures();
    this.time.delayedCall(300, () => this.scene.start('MainMenu'));
  }

  _generateTextures() {
    _buildParticleTexture(this);
    _buildSkyTexture(this);
  }
}

function _buildParticleTexture(scene) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 4;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 4, 4);
  scene.textures.addCanvas('particle', c);
}

function _buildSkyTexture(scene) {
  // 1×2 gradient approximation used as background
  const c = document.createElement('canvas');
  c.width = 1; c.height = 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a88ff'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#88ccff'; ctx.fillRect(0, 1, 1, 1);
  scene.textures.addCanvas('sky_grad', c);
}
