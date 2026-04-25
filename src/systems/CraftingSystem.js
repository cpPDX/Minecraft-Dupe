import { RecipeRegistry } from '../utils/RecipeRegistry.js';

export class CraftingSystem {
  constructor(inventory) {
    this.inventory = inventory;
  }

  /** Returns all recipes available at station that the player can craft. */
  getAvailable(station) {
    const recipes = RecipeRegistry.getForStation(station)
      .filter(r => r.type !== 'smelting');

    return recipes.filter(recipe => this._canCraft(recipe));
  }

  _canCraft(recipe) {
    const inv = this.inventory;
    if (recipe.type === 'shaped') {
      const totals = {};
      for (const row of recipe.pattern) {
        for (const cell of row) {
          if (cell) totals[cell] = (totals[cell] || 0) + 1;
        }
      }
      return Object.entries(totals).every(([id, n]) => inv.countItem(id) >= n);
    }
    if (recipe.type === 'shapeless') {
      const totals = {};
      for (const ing of recipe.ingredients) {
        totals[ing.itemId] = (totals[ing.itemId] || 0) + ing.count;
      }
      return Object.entries(totals).every(([id, n]) => inv.countItem(id) >= n);
    }
    return false;
  }

  /** Attempt to craft a recipe; returns true on success. */
  craft(recipeId) {
    const recipe = RecipeRegistry.getAll().find(r => r.id === recipeId);
    if (!recipe || !this._canCraft(recipe)) return false;

    // Consume ingredients
    if (recipe.type === 'shaped') {
      const totals = {};
      for (const row of recipe.pattern) {
        for (const cell of row) {
          if (cell) totals[cell] = (totals[cell] || 0) + 1;
        }
      }
      for (const [id, n] of Object.entries(totals)) {
        this.inventory.removeItem(id, n);
      }
    } else if (recipe.type === 'shapeless') {
      for (const ing of recipe.ingredients) {
        this.inventory.removeItem(ing.itemId, ing.count);
      }
    }

    // Add result
    this.inventory.addItem(recipe.result.itemId, recipe.result.count);
    return true;
  }
}
