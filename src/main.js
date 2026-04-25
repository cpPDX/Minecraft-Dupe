import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants.js';
import { Boot }           from './scenes/Boot.js';
import { Preload }        from './scenes/Preload.js';
import { MainMenu }       from './scenes/MainMenu.js';
import { Game }           from './scenes/Game.js';
import { HUDScene }       from './scenes/HUDScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { CraftingScene }  from './scenes/CraftingScene.js';
import { FurnaceScene }   from './scenes/FurnaceScene.js';
import { GameOver }       from './scenes/GameOver.js';

const config = {
  type: Phaser.AUTO,
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  antialias: false,

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    // We use custom physics; Phaser Arcade is not needed
  },

  input: {
    activePointers: 4, // multi-touch support
  },

  scene: [Boot, Preload, MainMenu, Game, HUDScene, InventoryScene, CraftingScene, FurnaceScene, GameOver],
};

// Suppress context menu on right-click
document.addEventListener('contextmenu', e => e.preventDefault());

new Phaser.Game(config);
