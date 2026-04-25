const SAVE_KEY = 'forge_save_v1';

export class SaveManager {
  hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  save(gameState) {
    try {
      const data = JSON.stringify(gameState);
      localStorage.setItem(SAVE_KEY, data);
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  }

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  autoSave(gameState) {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.save(gameState));
    } else {
      setTimeout(() => this.save(gameState), 0);
    }
  }
}
