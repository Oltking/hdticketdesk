/**
 * Tier color assignment based on price ranking
 * Colors are assigned from highest to lowest price tiers
 */

export const TIER_COLORS = [
  { rank: 1, name: 'Black', bgHex: '#000000', textHex: '#FFFFFF', borderHex: '#333333' },
  { rank: 2, name: 'Charcoal Grey', bgHex: '#36454F', textHex: '#FFFFFF', borderHex: '#4A5568' },
  { rank: 3, name: 'Burgundy Red', bgHex: '#800020', textHex: '#FFFFFF', borderHex: '#A0002F' },
  { rank: 4, name: 'Emerald Green', bgHex: '#50C878', textHex: '#FFFFFF', borderHex: '#3DA55E' },
  { rank: 5, name: 'Royal Blue', bgHex: '#4169E1', textHex: '#FFFFFF', borderHex: '#5A7FE5' },
  { rank: 6, name: 'Deep Purple', bgHex: '#673AB7', textHex: '#FFFFFF', borderHex: '#7E57C2' },
  { rank: 7, name: 'Champagne Gold', bgHex: '#F7E7CE', textHex: '#000000', borderHex: '#E5D5BC' },
  { rank: 8, name: 'Muted Teal', bgHex: '#5F9EA0', textHex: '#FFFFFF', borderHex: '#4A8A8C' },
  { rank: 9, name: 'Coral', bgHex: '#FF7F50', textHex: '#FFFFFF', borderHex: '#FF6A3D' },
  { rank: 10, name: 'Mustard Yellow', bgHex: '#FFDB58', textHex: '#000000', borderHex: '#E5C64A' },
];

export interface TierColorScheme {
  bgHex: string; // Background color hex
  textHex: string; // Text color hex
  borderHex: string; // Border color hex
  rank: number;
  colorName: string;
}

/**
 * Get color scheme for a tier based on its price ranking among all event tiers
 * @param tierPrice - Price of the current tier
 * @param allTierPrices - Array of all tier prices for the event
 * @returns Color scheme object
 */
export function getTierColorByPrice(
  tierPrice: number,
  allTierPrices: number[]
): TierColorScheme {
  // Sort prices in descending order (highest first)
  const sortedPrices = [...new Set(allTierPrices)].sort((a, b) => b - a);

  // Find the rank of this tier (1-based, 1 = highest price)
  const priceRank = sortedPrices.indexOf(tierPrice) + 1;

  // Get color for this rank (default to last color if more than 10 tiers)
  const colorIndex = Math.min(priceRank - 1, TIER_COLORS.length - 1);
  const color = TIER_COLORS[colorIndex];

  return {
    bgHex: color.bgHex,
    textHex: color.textHex,
    borderHex: color.borderHex,
    rank: priceRank,
    colorName: color.name,
  };
}

/**
 * Get color scheme for a tier when tier prices aren't available
 * Uses a default gradient
 */
export function getDefaultTierColor(): TierColorScheme {
  return {
    bgHex: '#667eea',
    textHex: '#FFFFFF',
    borderHex: '#5568d3',
    rank: 0,
    colorName: 'Default',
  };
}
