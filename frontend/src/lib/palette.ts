/** One set of category colours so every chart and legend agrees. */
export const PALETTE = ['#0A84FF', '#32D74B', '#FF9F0A', '#BF5AF2', '#FF375F', '#64D2FF', '#FFD60A', '#AC8E68'];
export const paletteColor = (i: number) => PALETTE[i % PALETTE.length];
