import { HOTBAR_SIZE, INV_ROWS, INV_COLS, MAX_STACK } from '../utils/constants.js';
import { ItemRegistry } from '../utils/ItemRegistry.js';

/**
 * Slot: null | { itemId: string, count: number, durability: number|null, def: object }
 */
export class InventorySystem {
  constructor() {
    this.hotbar    = new Array(HOTBAR_SIZE).fill(null);
    this.main      = new Array(INV_ROWS * INV_COLS).fill(null);
    this.hotbarIndex = 0;
  }

  // ─── Slot access ─────────────────────────────────────────────────────────

  getHotbarItem(index)  { return this.hotbar[index] ?? null; }
  getMainItem(index)    { return this.main[index]   ?? null; }
  setHotbarItem(index, slot) { this.hotbar[index] = slot; }
  setMainItem(index, slot)   { this.main[index]   = slot; }

  /** Add items; returns leftover count that didn't fit. */
  addItem(itemId, count = 1) {
    const def = ItemRegistry.get(itemId);
    if (!def) return count;

    let remaining = count;
    const all = [...this.hotbar, ...this.main];
    const stacks = this.hotbar.concat(this.main);

    // Fill existing stacks first
    if (def.stackable) {
      for (let i = 0; i < stacks.length && remaining > 0; i++) {
        const slot = stacks[i];
        if (slot && slot.itemId === itemId && slot.count < def.maxStack) {
          const space = def.maxStack - slot.count;
          const take  = Math.min(space, remaining);
          slot.count += take;
          remaining  -= take;
        }
      }
    }

    // Fill empty slots
    for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
      if (!this.hotbar[i]) {
        const take = def.stackable ? Math.min(def.maxStack, remaining) : 1;
        this.hotbar[i] = this._makeSlot(itemId, take, def);
        remaining -= take;
      }
    }
    for (let i = 0; i < this.main.length && remaining > 0; i++) {
      if (!this.main[i]) {
        const take = def.stackable ? Math.min(def.maxStack, remaining) : 1;
        this.main[i] = this._makeSlot(itemId, take, def);
        remaining -= take;
      }
    }

    return remaining; // leftover
  }

  _makeSlot(itemId, count, def) {
    return {
      itemId,
      count,
      def,
      durability: def.durability !== null ? def.durability : null,
    };
  }

  /** Remove `count` of itemId from inventory; returns how many removed. */
  removeItem(itemId, count = 1) {
    let remaining = count;
    const pools = [this.hotbar, this.main];
    for (const pool of pools) {
      for (let i = 0; i < pool.length && remaining > 0; i++) {
        const slot = pool[i];
        if (slot && slot.itemId === itemId) {
          const take = Math.min(slot.count, remaining);
          slot.count -= take;
          remaining  -= take;
          if (slot.count <= 0) pool[i] = null;
        }
      }
    }
    return count - remaining;
  }

  countItem(itemId) {
    let total = 0;
    for (const slot of [...this.hotbar, ...this.main]) {
      if (slot && slot.itemId === itemId) total += slot.count;
    }
    return total;
  }

  hasItem(itemId, count = 1) {
    return this.countItem(itemId) >= count;
  }

  /** Scatter all items as drops (on death). Returns array of {itemId, count}. */
  dropAll() {
    const items = [];
    const pool = [...this.hotbar, ...this.main];
    for (const slot of pool) {
      if (slot) items.push({ itemId: slot.itemId, count: slot.count });
    }
    this.hotbar.fill(null);
    this.main.fill(null);
    return items;
  }

  // ─── Serialization ───────────────────────────────────────────────────────

  serialize() {
    return {
      hotbar: this.hotbar.map(s => s ? { itemId: s.itemId, count: s.count, dur: s.durability } : null),
      main:   this.main.map(s => s ? { itemId: s.itemId, count: s.count, dur: s.durability } : null),
      hotbarIndex: this.hotbarIndex,
    };
  }

  deserialize(data) {
    if (!data) return;
    const load = (raw) => {
      if (!raw) return null;
      const def = ItemRegistry.get(raw.itemId);
      if (!def) return null;
      return { itemId: raw.itemId, count: raw.count, def, durability: raw.dur ?? null };
    };
    this.hotbar      = (data.hotbar || []).map(load);
    this.main        = (data.main   || []).map(load);
    this.hotbarIndex = data.hotbarIndex ?? 0;
    // Pad to correct lengths
    while (this.hotbar.length < HOTBAR_SIZE) this.hotbar.push(null);
    while (this.main.length   < INV_ROWS * INV_COLS) this.main.push(null);
  }
}
