// All crafting recipes.
// type: 'shaped' uses a 3x3 pattern. type: 'shapeless' uses an ingredient list.
// station: null = hands, 'crafting_table', 'furnace'

const recipes = [
  // === HANDS ===
  {
    id: 'oak_planks',
    station: null,
    type: 'shapeless',
    ingredients: [{ itemId: 'oak_log', count: 1 }],
    result: { itemId: 'oak_planks', count: 4 },
  },
  {
    id: 'pine_planks',
    station: null,
    type: 'shapeless',
    ingredients: [{ itemId: 'pine_log', count: 1 }],
    result: { itemId: 'pine_planks', count: 4 },
  },
  {
    id: 'jungle_planks',
    station: null,
    type: 'shapeless',
    ingredients: [{ itemId: 'jungle_log', count: 1 }],
    result: { itemId: 'pine_planks', count: 4 },
  },
  {
    id: 'crafting_table',
    station: null,
    type: 'shaped',
    pattern: [
      ['oak_planks', 'oak_planks', null],
      ['oak_planks', 'oak_planks', null],
      [null,         null,         null],
    ],
    result: { itemId: 'crafting_table', count: 1 },
  },
  {
    id: 'stick',
    station: null,
    type: 'shaped',
    pattern: [
      ['oak_planks', null, null],
      ['oak_planks', null, null],
      [null,         null, null],
    ],
    result: { itemId: 'stick', count: 4 },
  },
  {
    id: 'stick_pine',
    station: null,
    type: 'shaped',
    pattern: [
      ['pine_planks', null, null],
      ['pine_planks', null, null],
      [null,          null, null],
    ],
    result: { itemId: 'stick', count: 4 },
  },
  {
    id: 'torch',
    station: null,
    type: 'shaped',
    pattern: [
      ['coal', null, null],
      ['stick', null, null],
      [null,   null, null],
    ],
    result: { itemId: 'torch', count: 4 },
  },

  // === CRAFTING TABLE ===
  {
    id: 'wooden_pickaxe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['oak_planks', 'oak_planks', 'oak_planks'],
      [null,         'stick',      null],
      [null,         'stick',      null],
    ],
    result: { itemId: 'wooden_pickaxe', count: 1 },
  },
  {
    id: 'stone_pickaxe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['cobblestone', 'cobblestone', 'cobblestone'],
      [null,          'stick',       null],
      [null,          'stick',       null],
    ],
    result: { itemId: 'stone_pickaxe', count: 1 },
  },
  {
    id: 'iron_pickaxe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['iron_ingot', 'iron_ingot', 'iron_ingot'],
      [null,         'stick',      null],
      [null,         'stick',      null],
    ],
    result: { itemId: 'iron_pickaxe', count: 1 },
  },
  {
    id: 'diamond_pickaxe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['diamond', 'diamond', 'diamond'],
      [null,      'stick',   null],
      [null,      'stick',   null],
    ],
    result: { itemId: 'diamond_pickaxe', count: 1 },
  },
  {
    id: 'wooden_axe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['oak_planks', 'oak_planks', null],
      ['oak_planks', 'stick',      null],
      [null,         'stick',      null],
    ],
    result: { itemId: 'wooden_axe', count: 1 },
  },
  {
    id: 'stone_axe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['cobblestone', 'cobblestone', null],
      ['cobblestone', 'stick',       null],
      [null,          'stick',       null],
    ],
    result: { itemId: 'stone_axe', count: 1 },
  },
  {
    id: 'iron_axe',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['iron_ingot', 'iron_ingot', null],
      ['iron_ingot', 'stick',      null],
      [null,         'stick',      null],
    ],
    result: { itemId: 'iron_axe', count: 1 },
  },
  {
    id: 'wooden_shovel',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['oak_planks', null, null],
      ['stick',      null, null],
      ['stick',      null, null],
    ],
    result: { itemId: 'wooden_shovel', count: 1 },
  },
  {
    id: 'stone_shovel',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['cobblestone', null, null],
      ['stick',       null, null],
      ['stick',       null, null],
    ],
    result: { itemId: 'stone_shovel', count: 1 },
  },
  {
    id: 'wooden_sword',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['oak_planks', null, null],
      ['oak_planks', null, null],
      ['stick',      null, null],
    ],
    result: { itemId: 'wooden_sword', count: 1 },
  },
  {
    id: 'stone_sword',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['cobblestone', null, null],
      ['cobblestone', null, null],
      ['stick',       null, null],
    ],
    result: { itemId: 'stone_sword', count: 1 },
  },
  {
    id: 'iron_sword',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['iron_ingot', null, null],
      ['iron_ingot', null, null],
      ['stick',      null, null],
    ],
    result: { itemId: 'iron_sword', count: 1 },
  },
  {
    id: 'diamond_sword',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['diamond', null, null],
      ['diamond', null, null],
      ['stick',   null, null],
    ],
    result: { itemId: 'diamond_sword', count: 1 },
  },
  {
    id: 'furnace',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['cobblestone', 'cobblestone', 'cobblestone'],
      ['cobblestone', null,          'cobblestone'],
      ['cobblestone', 'cobblestone', 'cobblestone'],
    ],
    result: { itemId: 'furnace', count: 1 },
  },
  {
    id: 'chest',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['oak_planks', 'oak_planks', 'oak_planks'],
      ['oak_planks', null,         'oak_planks'],
      ['oak_planks', 'oak_planks', 'oak_planks'],
    ],
    result: { itemId: 'chest', count: 1 },
  },
  {
    id: 'stone_brick',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['stone', 'stone', null],
      ['stone', 'stone', null],
      [null,    null,    null],
    ],
    result: { itemId: 'stone_brick', count: 4 },
  },
  {
    id: 'bread',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['wheat', 'wheat', 'wheat'],
      [null,    null,    null],
      [null,    null,    null],
    ],
    result: { itemId: 'bread', count: 1 },
  },
  {
    id: 'iron_block',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['iron_ingot', 'iron_ingot', 'iron_ingot'],
      ['iron_ingot', 'iron_ingot', 'iron_ingot'],
      ['iron_ingot', 'iron_ingot', 'iron_ingot'],
    ],
    result: { itemId: 'iron_block', count: 1 },
  },
  {
    id: 'gold_block',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['gold_ingot', 'gold_ingot', 'gold_ingot'],
      ['gold_ingot', 'gold_ingot', 'gold_ingot'],
      ['gold_ingot', 'gold_ingot', 'gold_ingot'],
    ],
    result: { itemId: 'gold_block', count: 1 },
  },
  {
    id: 'diamond_block',
    station: 'crafting_table',
    type: 'shaped',
    pattern: [
      ['diamond', 'diamond', 'diamond'],
      ['diamond', 'diamond', 'diamond'],
      ['diamond', 'diamond', 'diamond'],
    ],
    result: { itemId: 'diamond_block', count: 1 },
  },

  // === FURNACE (smelting) ===
  {
    id: 'smelt_iron',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'iron_ore',   count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'iron_ingot', count: 1 },
    time:   10000,
  },
  {
    id: 'smelt_gold',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'gold_ore',   count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'gold_ingot', count: 1 },
    time:   10000,
  },
  {
    id: 'smelt_sand',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'sand',       count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'glass',      count: 1 },
    time:   10000,
  },
  {
    id: 'cook_pork',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'raw_pork',   count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'cooked_pork', count: 1 },
    time:   6000,
  },
  {
    id: 'cook_meat',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'raw_meat',   count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'cooked_meat', count: 1 },
    time:   6000,
  },
  {
    id: 'cook_fish',
    station: 'furnace',
    type: 'smelting',
    input:  { itemId: 'raw_fish',   count: 1 },
    fuel:   { itemId: 'coal',       count: 1 },
    result: { itemId: 'cooked_fish', count: 1 },
    time:   6000,
  },
];

export const RecipeRegistry = {
  getAll() { return recipes; },

  getForStation(station) {
    return recipes.filter(r => r.station === station);
  },

  /** Find a recipe matching inventory contents. Returns recipe or null. */
  findMatch(station, getCount) {
    const stationRecipes = recipes.filter(r => r.station === station && r.type !== 'smelting');
    for (const recipe of stationRecipes) {
      if (recipe.type === 'shaped') {
        if (matchShaped(recipe, getCount)) return recipe;
      } else if (recipe.type === 'shapeless') {
        if (matchShapeless(recipe, getCount)) return recipe;
      }
    }
    return null;
  },
};

function matchShaped(recipe, getCount) {
  // Check all non-null cells
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const needed = recipe.pattern[row][col];
      if (needed && getCount(needed) <= 0) return false;
    }
  }
  // Count total needed
  const totals = {};
  for (const row of recipe.pattern) {
    for (const cell of row) {
      if (cell) totals[cell] = (totals[cell] || 0) + 1;
    }
  }
  for (const [itemId, count] of Object.entries(totals)) {
    if (getCount(itemId) < count) return false;
  }
  return true;
}

function matchShapeless(recipe, getCount) {
  const totals = {};
  for (const ing of recipe.ingredients) {
    totals[ing.itemId] = (totals[ing.itemId] || 0) + ing.count;
  }
  for (const [itemId, count] of Object.entries(totals)) {
    if (getCount(itemId) < count) return false;
  }
  return true;
}
