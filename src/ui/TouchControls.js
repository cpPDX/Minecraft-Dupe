import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../utils/constants.js';

/**
 * Virtual joystick + action buttons overlay.
 * Emits a normalized input state that the Game scene reads each frame.
 */
export class TouchControls {
  constructor(scene) {
    this.scene = scene;

    // Input state (read by Game each update)
    this.state = {
      left: false, right: false, up: false, down: false,
      sprint: false,
      jumpJustPressed: false,
      breakHeld: false,
      placeJustPressed: false,
      inventoryJustPressed: false,
      aimTile: null,
    };

    // Joystick
    this._joyOrigin  = null;
    this._joyPointer = null;
    this._joyRadius  = 60;

    // Build graphics
    this._container = scene.add.container(0, 0).setDepth(100).setScrollFactor(0);
    this._build();
    this._registerPointers();
  }

  _build() {
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const C = this._container;

    // ── Left joystick base ──────────────────────────────────────────────
    this._joyBase = this.scene.add.graphics();
    this._joyBase.fillStyle(0xffffff, 0.12);
    this._joyBase.fillCircle(0, 0, this._joyRadius);
    this._joyBase.lineStyle(2, 0xffffff, 0.3);
    this._joyBase.strokeCircle(0, 0, this._joyRadius);
    this._joyBase.setPosition(100, H - 110);
    C.add(this._joyBase);

    this._joyStick = this.scene.add.graphics();
    this._joyStick.fillStyle(0xffffff, 0.25);
    this._joyStick.fillCircle(0, 0, 28);
    this._joyStick.setPosition(100, H - 110);
    C.add(this._joyStick);

    this._joyDefaultX = 100;
    this._joyDefaultY = H - 110;

    // ── Right side buttons ─────────────────────────────────────────────
    const btnR = W - 70, btnRowY = H - 80;

    this._btnBreak = this._makeBtn(btnR, btnRowY + 20, 36, '⛏', 0xff4444, 'B');
    this._btnPlace = this._makeBtn(btnR - 80, btnRowY + 20, 32, '📦', 0x44aaff, 'A');
    this._btnJump  = this._makeBtn(btnR - 40, btnRowY - 40, 32, '↑', 0x44ff44, 'J');

    // Inventory button (top-right)
    this._btnInv = this._makeBtn(W - 36, 36, 26, '🎒', 0xaaaaff, 'I');

    for (const b of [this._btnBreak, this._btnPlace, this._btnJump, this._btnInv]) {
      C.add(b.gfx); C.add(b.label);
    }
    C.add(this._joyBase);
    C.add(this._joyStick);

    // Sprint button (double-tap right on joystick — handled via timing)
    this._sprintActive = false;
  }

  _makeBtn(x, y, r, label, color, id) {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 0.2);
    gfx.fillCircle(0, 0, r);
    gfx.lineStyle(2, color, 0.5);
    gfx.strokeCircle(0, 0, r);
    gfx.setPosition(x, y);

    const lbl = this.scene.add.text(x, y, label, {
      fontSize: `${Math.max(12, r - 4)}px`, color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.7);

    return { gfx, label: lbl, x, y, r, id, pressed: false };
  }

  _registerPointers() {
    const scene = this.scene;

    scene.input.on('pointerdown', (ptr) => this._onDown(ptr));
    scene.input.on('pointermove', (ptr) => this._onMove(ptr));
    scene.input.on('pointerup',   (ptr) => this._onUp(ptr));

    // Keyboard fallback
    this._keys = scene.input.keyboard?.addKeys({
      left:   Phaser.Input.Keyboard.KeyCodes.A,
      right:  Phaser.Input.Keyboard.KeyCodes.D,
      up:     Phaser.Input.Keyboard.KeyCodes.W,
      down:   Phaser.Input.Keyboard.KeyCodes.S,
      left2:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up2:    Phaser.Input.Keyboard.KeyCodes.UP,
      jump:   Phaser.Input.Keyboard.KeyCodes.SPACE,
      inv:    Phaser.Input.Keyboard.KeyCodes.E,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) ?? null;

    // Mouse left-click = break, right-click = place
    scene.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown() && !this._isHudPointer(ptr)) {
        this._btnBreak.pressed = true;
      }
    });
    scene.input.on('pointerup', (ptr) => {
      if (!ptr.leftButtonDown()) this._btnBreak.pressed = false;
    });
  }

  _onDown(ptr) {
    const x = ptr.x, y = ptr.y;
    const H = GAME_HEIGHT;

    // Joystick zone: left half, bottom portion
    if (x < GAME_WIDTH * 0.45 && y > H * 0.55) {
      this._joyPointer = ptr.id;
      this._joyOrigin  = { x, y };
      this._joyStick.setPosition(x, y);
      this._joyBase.setPosition(x, y);
      return;
    }

    // Check buttons
    this._checkBtnDown(this._btnBreak, x, y);
    this._checkBtnDown(this._btnPlace, x, y);
    this._checkBtnDown(this._btnJump,  x, y);
    this._checkBtnDown(this._btnInv,   x, y);

    if (this._btnJump.pressed)  this.state.jumpJustPressed = true;
    if (this._btnInv.pressed)   this.state.inventoryJustPressed = true;
  }

  _onMove(ptr) {
    if (ptr.id !== this._joyPointer || !this._joyOrigin) return;

    const dx = ptr.x - this._joyOrigin.x;
    const dy = ptr.y - this._joyOrigin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const capped = Math.min(dist, this._joyRadius);
    const ratio = capped / dist || 0;

    const stickX = this._joyOrigin.x + dx * ratio;
    const stickY = this._joyOrigin.y + dy * ratio;
    this._joyStick.setPosition(stickX, stickY);

    const threshold = this._joyRadius * 0.25;
    this.state.left  = dx < -threshold;
    this.state.right = dx >  threshold;
    this.state.up    = dy < -threshold;
    this.state.down  = dy >  threshold;

    this.state.sprint = dist > this._joyRadius * 0.85;
  }

  _onUp(ptr) {
    if (ptr.id === this._joyPointer) {
      this._joyPointer = null;
      this._joyOrigin  = null;
      this._joyStick.setPosition(this._joyDefaultX, this._joyDefaultY);
      this._joyBase.setPosition(this._joyDefaultX, this._joyDefaultY);
      this.state.left = this.state.right = this.state.up = this.state.down = false;
      this.state.sprint = false;
      return;
    }

    this._checkBtnUp(this._btnBreak, ptr.id);
    this._checkBtnUp(this._btnPlace, ptr.id);
    this._checkBtnUp(this._btnJump,  ptr.id);
    this._checkBtnUp(this._btnInv,   ptr.id);

    if (!this._btnPlace.pressed) { /* place fires on release */ }
    if (!this._btnInv.pressed)   this.state.inventoryJustPressed = false;
  }

  _checkBtnDown(btn, x, y) {
    const dx = x - btn.x, dy = y - btn.y;
    if (dx * dx + dy * dy <= btn.r * btn.r * 1.4) {
      btn.pressed = true;
      btn.gfx.setAlpha(1.4);
    }
  }

  _checkBtnUp(btn, pid) {
    btn.pressed = false;
    btn.gfx.setAlpha(1);
  }

  _isHudPointer(ptr) {
    // Consider pointer as HUD if it's in the joystick zone or button area
    return ptr.y > GAME_HEIGHT * 0.55 && ptr.x < GAME_WIDTH * 0.45;
  }

  /** Called by Game scene each frame to collect final input state. */
  poll(pointerX, pointerY, camLeft, camTop, zoom) {
    const state = this.state;

    // Merge keyboard
    if (this._keys) {
      const k = this._keys;
      state.left   = state.left   || k.left.isDown  || k.left2.isDown;
      state.right  = state.right  || k.right.isDown || k.right2.isDown;
      state.up     = state.up     || k.up.isDown    || k.up2.isDown;
      state.sprint = state.sprint || k.sprint.isDown;

      if (Phaser.Input.Keyboard.JustDown(k.jump)) state.jumpJustPressed = true;
      if (Phaser.Input.Keyboard.JustDown(k.inv))  state.inventoryJustPressed = true;
    }

    state.breakHeld = this._btnBreak.pressed;
    state.placeJustPressed = false;

    // Compute aim tile from pointer (for desktop: mouse; for mobile: player-facing tile)
    if (pointerX !== null) {
      const worldX = camLeft + pointerX / zoom;
      const worldY = camTop  + pointerY / zoom;
      const tx = Math.floor(worldX / 16);
      const ty = Math.floor(worldY / 16);
      state.aimTile = { tx, ty };
    }

    // Reset one-shot states after consumption
    return { ...state };
  }

  /** Clear one-shot flags after each frame. */
  flush() {
    this.state.jumpJustPressed      = false;
    this.state.placeJustPressed     = false;
    this.state.inventoryJustPressed = false;
  }

  destroy() {
    this._container.destroy();
  }
}
