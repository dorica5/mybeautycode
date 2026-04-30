import { Dimensions, ScaledSize, Platform } from "react-native";

let screenData = Dimensions.get("window");
let { width, height } = screenData;

Dimensions.addEventListener("change", ({ window }: { window: ScaledSize }) => {
  width = window.width;
  height = window.height;
  screenData = window;
});

export const getDeviceType = () => {
  const deviceRatio = height / width;
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  if (Platform.OS === 'ios' && minDimension >= 768) {
    return 'tablet';
  } else if (Platform.OS === 'android' && minDimension >= 600) {
    return 'tablet';
  } else if (deviceRatio < 1.6) {
    return 'tablet';
  }
  
  return 'phone';
};

// Breakpoint system
export const getBreakpoint = () => {
  const deviceType = getDeviceType();
  
  if (deviceType === 'tablet') {
    if (width >= 1024) return 'xl'; 
    if (width >= 768) return 'lg';  // Regular tablets
    return 'md';                    // Small tablets
  }
  
  if (width >= 414) return 'sm';    // Large phones
  if (width >= 375) return 'xs';    // Regular phones
  return 'xxs';                     // Small phones
};

// Base dimensions for different device types
const baseDimensions = {
  phone: { width: 375, height: 812 },    // iPhone 11 Pro
  tablet: { width: 768, height: 1024 }   // iPad
};

// Get consistent width for percentage calculations
const getConsistentWidth = () => {
  const deviceType = getDeviceType();
  if (deviceType === 'tablet') {
    // Always use portrait width for tablets to ensure consistency
    return Math.min(width, height);
  }
  return width;
};

// Responsive scaling functions
export const responsiveScale = (phoneSize: number, tabletSize?: number) => {
  const deviceType = getDeviceType();
  const targetSize = tabletSize && deviceType === 'tablet' ? tabletSize : phoneSize;
  const baseWidth = baseDimensions[deviceType].width;
  
  if (deviceType === 'tablet') {
    // For tablets, scale more conservatively
    const scaleFactor = Math.min(width / baseWidth, 1.3);
    return Math.max(targetSize * scaleFactor, targetSize * 0.9);
  } else {
    // For phones, use more aggressive scaling
    const scaleFactor = width / baseWidth;
    return Math.max(targetSize * scaleFactor, targetSize * 0.8);
  }
};

export const responsiveVerticalScale = (phoneSize: number, tabletSize?: number) => {
  const deviceType = getDeviceType();
  const targetSize = tabletSize && deviceType === 'tablet' ? tabletSize : phoneSize;
  const baseHeight = baseDimensions[deviceType].height;
  
  if (deviceType === 'tablet') {
    const scaleFactor = Math.min(height / baseHeight, 1.2);
    return Math.max(targetSize * scaleFactor, targetSize * 0.9);
  } else {
    const scaleFactor = height / baseHeight;
    return Math.max(targetSize * scaleFactor, targetSize * 0.8);
  }
};

// Contextual scaling based on screen real estate
export const contextualScale = (size: number, context: 'padding' | 'margin' | 'font' | 'radius' = 'padding') => {
  const deviceType = getDeviceType();
  const breakpoint = getBreakpoint();
  
  let multiplier = 1;
  
  // Adjust multiplier based on context and device
  switch (context) {
    case 'padding':
      multiplier = deviceType === 'tablet' ? 1.2 : 1;
      break;
    case 'margin':
      multiplier = deviceType === 'tablet' ? 1.3 : 1;
      break;
    case 'font':
      multiplier = deviceType === 'tablet' ? 1.1 : 1;
      break;
    case 'radius':
      multiplier = deviceType === 'tablet' ? 1.2 : 1;
      break;
  }
  
  // Further adjust based on breakpoint
  switch (breakpoint) {
    case 'xxs':
      multiplier *= 0.85;
      break;
    case 'xs':
      multiplier *= 0.9;
      break;
    case 'sm':
      multiplier *= 1;
      break;
    case 'md':
      multiplier *= 1.1;
      break;
    case 'lg':
      multiplier *= 1.2;
      break;
    case 'xl':
      multiplier *= 1.3;
      break;
  }
  
  return responsiveScale(size * multiplier);
};

// Specific helper functions
export const responsivePadding = (size: number, tabletSize?: number) => 
  contextualScale(tabletSize && getDeviceType() === 'tablet' ? tabletSize : size, 'padding');

export const responsiveMargin = (size: number, tabletSize?: number) => 
  contextualScale(tabletSize && getDeviceType() === 'tablet' ? tabletSize : size, 'margin');

export const responsiveFontSize = (size: number, tabletSize?: number) => 
  contextualScale(tabletSize && getDeviceType() === 'tablet' ? tabletSize : size, 'font');

export const responsiveBorderRadius = (size: number, tabletSize?: number) => 
  contextualScale(tabletSize && getDeviceType() === 'tablet' ? tabletSize : size, 'radius');

// FIXED: Percentage-based sizing with consistent width
export const widthPercent = (percent: number) => (getConsistentWidth() * percent) / 100;
export const heightPercent = (percent: number) => (height * percent) / 100;

// FIXED: Use consistent width for percentage calculations
export const scalePercent = (percent: number) => {
  const consistentWidth = getConsistentWidth();
  return (consistentWidth * percent) / 100;
};

// Min/max constraints
export const minMaxScale = (size: number, min: number, max: number, tabletSize?: number) => {
  const scaled = responsiveScale(size, tabletSize);
  return Math.min(Math.max(scaled, min), max);
};

/**
 * Design ratio for primary mint/content cards: ~342pt column on a 375pt-wide phone.
 * Using the short side keeps the same visual proportion on iPad portrait/landscape.
 */
export const CONTENT_CARD_WIDTH_RATIO = 342 / 375;

/**
 * Max width for mint “card” columns on tablets — same fraction of the short side as on phones.
 * `absoluteMax` avoids overly wide panels on very large slates.
 */
export function contentCardMaxWidth(
  shortSide: number,
  options?: { absoluteMax?: number }
): number {
  const absoluteMax = options?.absoluteMax ?? 960;
  return Math.min(
    Math.round(shortSide * CONTENT_CARD_WIDTH_RATIO),
    absoluteMax
  );
}

// Utility for responsive values based on breakpoint
export const responsiveValue = <T>(values: {
  xxs?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default: T;
}): T => {
  const breakpoint = getBreakpoint();
  return values[breakpoint] || values.default;
};

// Screen dimension utilities
export const screenWidth = () => width;
export const screenHeight = () => height;
export const isTablet = () => getDeviceType() === 'tablet';
export const isPhone = () => getDeviceType() === 'phone';

export const scale = responsiveScale;
export const verticalScale = responsiveVerticalScale;
export const moderateScale = (size: number, factor = 0.5) => {
  const scaled = responsiveScale(size);
  return size + (scaled - size) * factor;
};