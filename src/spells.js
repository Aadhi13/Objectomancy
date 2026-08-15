export const SPELLS = {
  bottle: {
    id: 'bottle',
    displayName: "Vessel of Hydration",
    flavor: "A quiet enchantment of clarity and flow.",
    actionName: "Cast Refreshing Charm",
    element: "Water",
    color: "#0ea5e9", // cyan
    rune: "ᛗ",
    rarity: "Common"
  },
  cup: {
    id: 'cup',
    displayName: "Cauldron of Comfort",
    flavor: "Brimming with subtle restorative energies.",
    actionName: "Sip Vitality",
    element: "Fire",
    color: "#f97316", // orange
    rune: "ᚢ",
    rarity: "Common"
  },
  book: {
    id: 'book',
    displayName: "Tome of Forgotten Knowledge",
    flavor: "Whispers secrets of the ancient past to those who listen.",
    actionName: "Read Inscription",
    element: "Arcane",
    color: "#a855f7", // purple
    rune: "ᛈ",
    rarity: "Rare"
  },
  laptop: {
    id: 'laptop',
    displayName: "Arcane Calculation Engine",
    flavor: "A glass mirror bridging realms of logic and light.",
    actionName: "Overclock",
    element: "Lightning",
    color: "#eab308", // gold/yellow
    rune: "ᛋ",
    rarity: "Legendary"
  },
  "cell phone": {
    id: 'cell phone',
    displayName: "Oracle's Mirror",
    flavor: "Connects minds across vast, unimaginable distances.",
    actionName: "Divining Sight",
    element: "Divination",
    color: "#ec4899", // pink
    rune: "ᛟ",
    rarity: "Uncommon"
  },
  chair: {
    id: 'chair',
    displayName: "Throne of Rest",
    flavor: "Offers sanctuary to the weary traveler.",
    actionName: "Rest & Recover",
    element: "Earth",
    color: "#22c55e", // green
    rune: "ᛒ",
    rarity: "Common"
  },
  backpack: {
    id: 'backpack',
    displayName: "Bag of Holding",
    flavor: "Spatially distorted to carry burdens far larger than it appears.",
    actionName: "Stow Relic",
    element: "Spatial",
    color: "#8b5cf6", // violet
    rune: "ᚺ",
    rarity: "Rare"
  },
  keyboard: {
    id: 'keyboard',
    displayName: "Rune Tablet",
    flavor: "Striking its keys weaves intricate digital spellcraft.",
    actionName: "Weave Spell",
    element: "Order",
    color: "#64748b", // slate
    rune: "ᚱ",
    rarity: "Uncommon"
  },
  mouse: {
    id: 'mouse',
    displayName: "Familiar of Guidance",
    flavor: "A tiny construct that translates intent into action.",
    actionName: "Point the Way",
    element: "Beast",
    color: "#f43f5e", // rose
    rune: "ᚷ",
    rarity: "Uncommon"
  },
  handbag: {
    id: 'handbag',
    displayName: "Satchel of Secrets",
    flavor: "Conceals mysterious treasures from prying eyes.",
    actionName: "Conceal",
    element: "Shadow",
    color: "#737373", // neutral
    rune: "ᚦ",
    rarity: "Rare"
  }
};

// Normalized enchantment state factory
export function getEnchantmentForClass(className) {
  return SPELLS[className] || null;
}
