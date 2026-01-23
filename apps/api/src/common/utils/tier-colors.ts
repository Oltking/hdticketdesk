/**
 * Tier color assignment based on price ranking
 * Colors are assigned from highest to lowest price tiers
 */

export const TIER_COLORS = [
  { rank: 1, name: 'Black', bg: '#000000', text: '#FFFFFF', border: '#333333' },
  { rank: 2, name: 'Charcoal Grey', bg: '#36454F', text: '#FFFFFF', border: '#4A5568' },
  { rank: 3, name: 'Burgundy Red', bg: '#800020', text: '#FFFFFF', border: '#A0002F' },
  { rank: 4, name: 'Emerald Green', bg: '#50C878', text: '#FFFFFF', border: '#3DA55E' },
  { rank: 5, name: 'Royal Blue', bg: '#4169E1', text: '#FFFFFF', border: '#5A7FE5' },
  { rank: 6, name: 'Deep Purple', bg: '#673AB7', text: '#FFFFFF', border: '#7E57C2' },
  { rank: 7, name: 'Champagne Gold', bg: '#F7E7CE', text: '#000000', border: '#E5D5BC' },
  { rank: 8, name: 'Muted Teal', bg: '#5F9EA0', text: '#FFFFFF', border: '#4A8A8C' },
  { rank: 9, name: 'Coral', bg: '#FF7F50', text: '#FFFFFF', border: '#FF6A3D' },
  { rank: 10, name: 'Mustard Yellow', bg: '#FFDB58', text: '#000000', border: '#E5C64A' },
];

export interface TierColorScheme {
  bg: string;
  text: string;
  border: string;
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
    bg: color.bg,
    text: color.text,
    border: color.border,
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
    bg: '#667eea',
    text: '#FFFFFF',
    border: '#5568d3',
    rank: 0,
    colorName: 'Default',
  };
}
