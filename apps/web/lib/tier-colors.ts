/**
 * Tier color assignment based on price ranking
 * Colors are assigned from highest to lowest price tiers
 */

export const TIER_COLORS = [
  { rank: 1, name: 'Black', bg: 'bg-black', text: 'text-white', border: 'border-gray-800', hex: '#000000' },
  { rank: 2, name: 'Charcoal Grey', bg: 'bg-[#36454F]', text: 'text-white', border: 'border-gray-600', hex: '#36454F' },
  { rank: 3, name: 'Burgundy Red', bg: 'bg-[#800020]', text: 'text-white', border: 'border-[#A0002F]', hex: '#800020' },
  { rank: 4, name: 'Emerald Green', bg: 'bg-[#50C878]', text: 'text-white', border: 'border-[#3DA55E]', hex: '#50C878' },
  { rank: 5, name: 'Royal Blue', bg: 'bg-[#4169E1]', text: 'text-white', border: 'border-[#5A7FE5]', hex: '#4169E1' },
  { rank: 6, name: 'Deep Purple', bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500', hex: '#673AB7' },
  { rank: 7, name: 'Champagne Gold', bg: 'bg-[#F7E7CE]', text: 'text-black', border: 'border-[#E5D5BC]', hex: '#F7E7CE' },
  { rank: 8, name: 'Muted Teal', bg: 'bg-[#5F9EA0]', text: 'text-white', border: 'border-[#4A8A8C]', hex: '#5F9EA0' },
  { rank: 9, name: 'Coral', bg: 'bg-[#FF7F50]', text: 'text-white', border: 'border-[#FF6A3D]', hex: '#FF7F50' },
  { rank: 10, name: 'Mustard Yellow', bg: 'bg-[#FFDB58]', text: 'text-black', border: 'border-[#E5C64A]', hex: '#FFDB58' },
];

export interface TierColorScheme {
  bg: string; // Tailwind class
  text: string; // Tailwind class
  border: string; // Tailwind class
  hex: string; // Hex color for inline styles
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
    hex: color.hex,
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
    bg: 'bg-primary',
    text: 'text-white',
    border: 'border-primary',
    hex: '#667eea',
    rank: 0,
    colorName: 'Default',
  };
}
