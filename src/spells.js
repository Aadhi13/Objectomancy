export const SPELLS = {
  bottle: {
    id: 'bottle',
    displayName: "Vessel of Hydration",
    flavor: "A quiet enchantment of clarity and flow.",
    actionName: "Cast Refreshing Charm"
  },
  cup: {
    id: 'cup',
    displayName: "Chalice of Rejuvenation",
    flavor: "Brimming with subtle restorative energies.",
    actionName: "Sip Vitality"
  },
  book: {
    id: 'book',
    displayName: "Tome of Forgotten Lore",
    flavor: "Whispers secrets of the ancient past to those who listen.",
    actionName: "Read Inscription"
  },
  laptop: {
    id: 'laptop',
    displayName: "Scrying Slate",
    flavor: "A glass mirror bridging realms of logic and light.",
    actionName: "Channel Data"
  },
  "cell phone": {
    id: 'cell phone',
    displayName: "Whisper Stone",
    flavor: "Connects minds across vast, unimaginable distances.",
    actionName: "Send Sending"
  },
  chair: {
    id: 'chair',
    displayName: "Throne of Respite",
    flavor: "Offers sanctuary to the weary traveler.",
    actionName: "Rest & Recover"
  },
  backpack: {
    id: 'backpack',
    displayName: "Bag of Holding",
    flavor: "Spacially distorted to carry burdens far larger than it appears.",
    actionName: "Stow Relic"
  },
  keyboard: {
    id: 'keyboard',
    displayName: "Rune Tablet",
    flavor: "Striking its keys weaves intricate digital spellcraft.",
    actionName: "Weave Spell"
  },
  mouse: {
    id: 'mouse',
    displayName: "Familiar of Guidance",
    flavor: "A tiny construct that translates intent into action.",
    actionName: "Point the Way"
  },
  handbag: {
    id: 'handbag',
    displayName: "Satchel of Secrets",
    flavor: "Conceals mysterious treasures from prying eyes.",
    actionName: "Conceal"
  }
};

// Normalized enchantment state factory
export function getEnchantmentForClass(className) {
  return SPELLS[className] || null;
}
