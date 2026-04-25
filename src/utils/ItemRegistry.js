import { TILES } from './constants.js';

// item id -> definition
const ITEMS = {};

function def(id, name, opts = {}) {
  ITEMS[id] = {
    id,
    name,
    stackable:    opts.stackable    ?? true,
    maxStack:     opts.maxStack     ?? 64,
    tileId:       opts.tileId       ?? null,
    toolType:     opts.toolType     ?? null,
    toolTier:     opts.toolTier     ?? 0,
    damage:       opts.damage       ?? 0,
    durability:   opts.durability   ?? null,
    maxDurability: opts.maxDurability ?? null,
    hungerRestore: opts.hungerRestore ?? 0,
    color:        opts.color        ?? '#aaaaaa',
  };
}

// Materials / blocks
def('dirt',           'Dirt',           { tileId: TILES.DIRT,           color: '#6b3a2a' });
def('cobblestone',    'Cobblestone',    { tileId: TILES.COBBLESTONE,    color: '#606060' });
def('stone',          'Stone',          { tileId: TILES.STONE,          color: '#7a7a7a' });
def('sand',           'Sand',           { tileId: TILES.SAND,           color: '#d4b463' });
def('gravel',         'Gravel',         { tileId: TILES.GRAVEL,         color: '#808080' });
def('oak_log',        'Oak Log',        { tileId: TILES.OAK_LOG,        color: '#5a3a1a' });
def('pine_log',       'Pine Log',       { tileId: TILES.PINE_LOG,       color: '#4a2a0a' });
def('jungle_log',     'Jungle Log',     { tileId: TILES.JUNGLE_LOG,     color: '#3a5a1a' });
def('oak_planks',     'Oak Planks',     { tileId: TILES.OAK_PLANKS,     color: '#c8964a' });
def('pine_planks',    'Pine Planks',    { tileId: TILES.PINE_PLANKS,    color: '#8a5a2a' });
def('stone_brick',    'Stone Brick',    { tileId: TILES.STONE_BRICK,    color: '#5a5a6a' });
def('glass',          'Glass',          { tileId: TILES.GLASS,          color: '#80c0e0' });
def('torch',          'Torch',          { tileId: TILES.TORCH,          color: '#ff9900' });
def('chest',          'Chest',          { tileId: TILES.CHEST,          color: '#c89632' });
def('crafting_table', 'Crafting Table', { tileId: TILES.CRAFTING_TABLE, color: '#8b4513' });
def('furnace',        'Furnace',        { tileId: TILES.FURNACE,        color: '#888888' });
def('iron_block',     'Iron Block',     { tileId: TILES.IRON_BLOCK,     color: '#c0c0c0' });
def('gold_block',     'Gold Block',     { tileId: TILES.GOLD_BLOCK,     color: '#ffd700' });
def('diamond_block',  'Diamond Block',  { tileId: TILES.DIAMOND_BLOCK,  color: '#44ddff' });
def('sandstone',      'Sandstone',      { tileId: TILES.SANDSTONE,      color: '#c8a850' });
def('netherrack',     'Netherrack',     { tileId: TILES.NETHERRACK,     color: '#6a1a1a' });
def('obsidian',       'Obsidian',       { tileId: TILES.OBSIDIAN,       color: '#1a0a2a' });
def('glowstone_dust', 'Glowstone Dust', { color: '#ffee88' });

// Raw resources
def('coal',         'Coal',         { color: '#333333' });
def('iron_ore',     'Iron Ore',     { color: '#8a6a4a' });
def('gold_ore',     'Gold Ore',     { color: '#7a7040' });
def('diamond',      'Diamond',      { color: '#44ddff' });
def('iron_ingot',   'Iron Ingot',   { color: '#c8c8c8' });
def('gold_ingot',   'Gold Ingot',   { color: '#ffd700' });
def('stick',        'Stick',        { color: '#8b6914' });
def('string',       'String',       { color: '#eeeeee' });
def('bone',         'Bone',         { color: '#f5f5dc' });
def('arrow',        'Arrow',        { color: '#808040' });
def('gunpowder',    'Gunpowder',    { color: '#444444' });
def('slimeball',    'Slimeball',    { color: '#44ff44' });
def('rotten_flesh', 'Rotten Flesh', { color: '#8b4513', hungerRestore: 1 });
def('spider_eye',   'Spider Eye',   { color: '#cc2222' });
def('snowball',     'Snowball',     { color: '#e8eeff' });
def('clay_ball',    'Clay Ball',    { color: '#9aacbc' });
def('hellstone_bar','Hellstone Bar',{ color: '#cc4400' });
def('cactus',       'Cactus',       { tileId: TILES.CACTUS, color: '#2a7a1a' });
def('red_flower',   'Red Flower',   { tileId: TILES.FLOWER_RED,    color: '#ff4444' });
def('yellow_flower','Yellow Flower',{ tileId: TILES.FLOWER_YELLOW, color: '#ffdd44' });
def('oak_sapling',  'Oak Sapling',  { color: '#4a8a1a' });
def('magma_cream',  'Magma Cream',  { color: '#ff8800' });

// Food
def('apple',        'Apple',        { color: '#ff4444', hungerRestore: 4 });
def('raw_pork',     'Raw Pork',     { color: '#ffaaaa', hungerRestore: 3 });
def('cooked_pork',  'Cooked Pork',  { color: '#cc6633', hungerRestore: 8 });
def('raw_meat',     'Raw Meat',     { color: '#ffaaaa', hungerRestore: 3 });
def('cooked_meat',  'Cooked Meat',  { color: '#cc6633', hungerRestore: 8 });
def('bread',        'Bread',        { color: '#c8963c', hungerRestore: 5 });
def('raw_fish',     'Raw Fish',     { color: '#8888ff', hungerRestore: 2 });
def('cooked_fish',  'Cooked Fish',  { color: '#c8a870', hungerRestore: 5 });

// Tools — tier: 0=wood 1=stone 2=iron 3=gold 4=diamond
def('wooden_pickaxe',  'Wooden Pickaxe',  { stackable: false, maxStack: 1, toolType: 'pickaxe', toolTier: 0, damage: 2,  durability: 60,  maxDurability: 60,  color: '#c8964a' });
def('stone_pickaxe',   'Stone Pickaxe',   { stackable: false, maxStack: 1, toolType: 'pickaxe', toolTier: 1, damage: 3,  durability: 132, maxDurability: 132, color: '#808080' });
def('iron_pickaxe',    'Iron Pickaxe',    { stackable: false, maxStack: 1, toolType: 'pickaxe', toolTier: 2, damage: 4,  durability: 251, maxDurability: 251, color: '#c8c8c8' });
def('gold_pickaxe',    'Gold Pickaxe',    { stackable: false, maxStack: 1, toolType: 'pickaxe', toolTier: 3, damage: 3,  durability: 33,  maxDurability: 33,  color: '#ffd700' });
def('diamond_pickaxe', 'Diamond Pickaxe', { stackable: false, maxStack: 1, toolType: 'pickaxe', toolTier: 4, damage: 5,  durability: 1562,maxDurability: 1562,color: '#44ddff' });

def('wooden_axe',   'Wooden Axe',   { stackable: false, maxStack: 1, toolType: 'axe', toolTier: 0, damage: 3,  durability: 60,  maxDurability: 60,  color: '#c8964a' });
def('stone_axe',    'Stone Axe',    { stackable: false, maxStack: 1, toolType: 'axe', toolTier: 1, damage: 4,  durability: 132, maxDurability: 132, color: '#808080' });
def('iron_axe',     'Iron Axe',     { stackable: false, maxStack: 1, toolType: 'axe', toolTier: 2, damage: 5,  durability: 251, maxDurability: 251, color: '#c8c8c8' });
def('diamond_axe',  'Diamond Axe',  { stackable: false, maxStack: 1, toolType: 'axe', toolTier: 4, damage: 6,  durability: 1562,maxDurability: 1562,color: '#44ddff' });

def('wooden_shovel',  'Wooden Shovel',  { stackable: false, maxStack: 1, toolType: 'shovel', toolTier: 0, damage: 1, durability: 60,  maxDurability: 60,  color: '#c8964a' });
def('stone_shovel',   'Stone Shovel',   { stackable: false, maxStack: 1, toolType: 'shovel', toolTier: 1, damage: 2, durability: 132, maxDurability: 132, color: '#808080' });
def('iron_shovel',    'Iron Shovel',    { stackable: false, maxStack: 1, toolType: 'shovel', toolTier: 2, damage: 3, durability: 251, maxDurability: 251, color: '#c8c8c8' });

def('wooden_sword',  'Wooden Sword',  { stackable: false, maxStack: 1, toolType: 'sword', toolTier: 0, damage: 4,  durability: 60,  maxDurability: 60,  color: '#c8964a' });
def('stone_sword',   'Stone Sword',   { stackable: false, maxStack: 1, toolType: 'sword', toolTier: 1, damage: 5,  durability: 132, maxDurability: 132, color: '#808080' });
def('iron_sword',    'Iron Sword',    { stackable: false, maxStack: 1, toolType: 'sword', toolTier: 2, damage: 7,  durability: 251, maxDurability: 251, color: '#c8c8c8' });
def('gold_sword',    'Gold Sword',    { stackable: false, maxStack: 1, toolType: 'sword', toolTier: 3, damage: 5,  durability: 33,  maxDurability: 33,  color: '#ffd700' });
def('diamond_sword', 'Diamond Sword', { stackable: false, maxStack: 1, toolType: 'sword', toolTier: 4, damage: 9,  durability: 1562,maxDurability: 1562,color: '#44ddff' });

export const ItemRegistry = {
  get(id) { return ITEMS[id] || null; },
  all() { return Object.values(ITEMS); },
};
