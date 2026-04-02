const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

/** Brand palette — import these or use `Colors.light` / `Colors.dark` / `useThemeColor`. */
export const primaryGreen = '#B2DCC5';
export const primaryBlack = '#212427';
export const primaryWhite = '#F1F9F4';
export const secondaryGreen = '#D8EDE2';

/** Full-screen sage for professional onboarding (design mockup). */
export const setupSageBackground = '#C5DCC9';

const yellowish = '#E1E8DF';
const warmGreen = '#8FA8A1'; // Note the corrected format for hex color
const dark = primaryBlack;
const light = '#F8F8FF';
const yelllowish = '#E2E9DB';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    yellowish: yellowish, // Added the yellowish color
    warmGreen: warmGreen, // Added the warmGreen color
    dark: dark, // Added the dark color
    light: light, // Added the light color
    primaryGreen,
    primaryBlack,
    primaryWhite,
    secondaryGreen,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    yellowish: yellowish, // Added the yellowish color
    warmGreen: warmGreen, // Added the warmGreen color
    dark: dark, // Added the dark color
    light: light, // Added the light color
    primaryGreen,
    primaryBlack,
    primaryWhite,
    secondaryGreen,
  },
};
