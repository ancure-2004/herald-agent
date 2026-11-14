// ============================================================================
// AUTOPILOT COCKPIT DESIGN TOKENS (DARK OLED PALETTE)
// ============================================================================

export const CockpitTokens = {
  // Neutral Canvas & Surface Scales (Dark OLED first)
  colors: {
    bgBase: "#090A0C",          // Deepest obsidian canvas
    surface: "#111215",         // Card and table row resting surface
    elevated: "#17181D",        // Modals, drawers, popovers
    subtle: "#1C1E24",          // Tab bar frame, input backgrounds
    hover: "#22252C",           // Row hover, button hover
    active: "#292C35",          // Selected rows, pressed states

    // Hairline Borders
    borderHairline: "rgba(255, 255, 255, 0.08)", // 1px structural dividing lines
    borderSubtle: "rgba(255, 255, 255, 0.12)",   // Section dividers
    borderFocus: "#38BDF8",                       // Sky/cyan focus ring

    // Typography Colors
    textPrimary: "#F8FAFC",     // Pure high-contrast foreground text
    textSecondary: "#94A3B8",   // Field labels, secondary metadata
    textMuted: "#64748B",       // Timestamps, line numbers, placeholders
    textDisabled: "#475569",    // Disabled states

    // Functional Semantic Status Tokens
    semantic: {
      emerald: {
        base: "#10B981",
        bg: "rgba(16, 185, 129, 0.10)",
        border: "rgba(16, 185, 129, 0.20)",
        text: "#34D399",
      },
      amber: {
        base: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.10)",
        border: "rgba(245, 158, 11, 0.20)",
        text: "#FBBF24",
      },
      rose: {
        base: "#EF4444",
        bg: "rgba(239, 68, 68, 0.10)",
        border: "rgba(239, 68, 68, 0.20)",
        text: "#F87171",
      },
      sky: {
        base: "#38BDF8",
        bg: "rgba(56, 189, 248, 0.10)",
        border: "rgba(56, 189, 248, 0.20)",
        text: "#38BDF8",
      },
      indigo: {
        base: "#6366F1",
        bg: "rgba(99, 102, 241, 0.10)",
        border: "rgba(99, 102, 241, 0.20)",
        text: "#818CF8",
      },
    },
  },

  // Shadows & Tactile Highlights
  shadows: {
    hairline: "0 0 0 1px rgba(255, 255, 255, 0.08)",
    innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    card: "0 1px 3px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    popover: "0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)",
  },

  // Corner Radii
  radii: {
    xs: "3px",
    sm: "5px",
    md: "7px",
    lg: "10px",
    xl: "14px",
    full: "9999px",
  },

  // Transitions
  transitions: {
    snappy: "120ms cubic-bezier(0, 0, 0.2, 1)",
    spring: {
      type: "spring",
      stiffness: 450,
      damping: 35,
      mass: 0.8,
    },
  },
} as const;
