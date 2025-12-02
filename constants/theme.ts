/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#D70015"; // Deeper Enterprise Red
const tintColorDark = "#FFD60A"; // Premium Gold

export const Palette = {
  red: "#D70015",
  crimson: "#A8000B",
  yellow: "#FFD60A",
  gold: "#FFC107",
  black: "#000000",
  darkGray: "#121212",
  cardGray: "#1C1C1E",
  borderGray: "#2C2C2E",
  lightGray: "#8E8E93",
  white: "#FFFFFF",
  glass: "rgba(28, 28, 30, 0.75)",
};

export const Colors = {
  light: {
    text: "#000000",
    background: "#F2F2F7",
    tint: tintColorLight,
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#FFFFFF",
    background: "#000000",
    tint: tintColorDark,
    icon: "#8E8E93",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
