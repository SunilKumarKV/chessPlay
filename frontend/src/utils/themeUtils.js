/**
 * Theme Utility Helpers
 * Common patterns and utilities for applying theme colors consistently
 */

export const themeUtils = {
  /**
   * Create a button style with theme colors
   * Usage: <button style={themeUtils.buttonStyle(theme, isActive)} />
   */
  buttonStyle: (theme, isActive = false) => ({
    backgroundColor: isActive ? theme.active : "transparent",
    color: isActive ? theme.text.primary : theme.text.secondary,
    transition: "all 0.2s ease",
  }),

  /**
   * Create a card/container style with theme colors
   */
  cardStyle: (theme) => ({
    backgroundColor: theme.bg.secondary,
    borderColor: theme.border.primary,
    border: `1px solid ${theme.border.primary}`,
    color: theme.text.primary,
  }),

  /**
   * Create input field style with theme colors
   */
  inputStyle: (theme, isDark) => ({
    backgroundColor: isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.03)",
    borderColor: theme.border.secondary,
    border: `1px solid ${theme.border.secondary}`,
    color: theme.text.primary,
    caretColor: theme.primary,
  }),

  /**
   * Create a hover effect function
   * Usage: onMouseEnter={(e) => themeUtils.applyHover(e.currentTarget, theme)}
   */
  applyHover: (element, theme) => {
    element.style.backgroundColor = theme.hover;
    element.style.color = theme.text.primary;
  },

  /**
   * Remove hover effect
   */
  removeHover: (element, theme, initialBg = "transparent") => {
    element.style.backgroundColor = initialBg;
    element.style.color = theme.text.secondary;
  },

  /**
   * Create a table row style with alternating colors
   */
  tableRowStyle: (theme, isEven) => ({
    backgroundColor: isEven ? "transparent" : theme.bg.secondary,
    color: theme.text.primary,
    borderColor: theme.border.primary,
  }),

  /**
   * Create a badge/label style
   */
  badgeStyle: (theme, type = "primary") => {
    const styles = {
      primary: { bg: theme.primary, text: "#fff" },
      success: { bg: theme.success, text: "#fff" },
      error: { bg: theme.error, text: "#fff" },
      warning: { bg: theme.warning, text: "#000" },
      info: { bg: theme.info, text: "#fff" },
    };

    const style = styles[type] || styles.primary;

    return {
      backgroundColor: style.bg,
      color: style.text,
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "bold",
    };
  },

  /**
   * Create a shadow style with theme-aware color
   */
  shadowStyle: () => ({
    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
  }),

  /**
   * Create common text styles
   */
  textStyles: {
    heading: (theme) => ({
      color: theme.text.primary,
      fontWeight: "bold",
      fontSize: "24px",
    }),
    subheading: (theme) => ({
      color: theme.text.secondary,
      fontWeight: "600",
      fontSize: "18px",
    }),
    body: (theme) => ({
      color: theme.text.primary,
      fontSize: "16px",
    }),
    small: (theme) => ({
      color: theme.text.tertiary,
      fontSize: "14px",
    }),
    muted: (theme) => ({
      color: theme.text.muted,
      fontSize: "14px",
    }),
  },

  /**
   * Create a focus ring style (for accessibility)
   */
  focusRing: (theme) => ({
    outline: "none",
    boxShadow: `0 0 0 3px ${theme.primary}40`,
    transition: "box-shadow 0.2s ease",
  }),

  /**
   * Create a disabled state style
   */
  disabledStyle: (theme) => ({
    backgroundColor: theme.disabled,
    color: theme.text.tertiary,
    cursor: "not-allowed",
    opacity: 0.6,
  }),
};

export default themeUtils;
