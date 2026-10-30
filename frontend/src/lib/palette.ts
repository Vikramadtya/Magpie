/** One set of category colours so every chart and legend agrees. Rich but not neon. */
export const PALETTE = ['#5B6CF2', '#2FB67C', '#F2A33A', '#A06CF2', '#EE5D7C', '#3BB4D6', '#D9B93A', '#8B8F9C'];
export const paletteColor = (i: number) => PALETTE[i % PALETTE.length];
