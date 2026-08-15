export const SPELLS = {
  bottle: {
    id: 'bottle',
    displayName: "Vessel of Hydration",
    flavor: "a quiet enchantment of clarity and flow",
    actionName: "Cast Refreshing Charm"
  }
};

// Normalized enchantment state factory
export function getEnchantmentForClass(className) {
  return SPELLS[className] || null;
}
