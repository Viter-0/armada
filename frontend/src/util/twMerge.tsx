import { extendTailwindMerge, twJoin } from "tailwind-merge";

type AdditionalClassGroupIDs = "btn" | "noBtn" | "bg";

export const twClassJoin = twJoin;
export const twClassMerge = extendTailwindMerge<AdditionalClassGroupIDs>({
  // ↓ Override elements from the default config
  //   It has the same shape as the `extend` object, so we're going to skip it here.
  override: {},
  // ↓ Extend values from the default config
  extend: {
    // ↓ Add values to existing theme scale or create a new one
    theme: {},
    // ↓ Add values to existing class groups or define new ones
    classGroups: {
      btn: [{ btn: ["primary", "neutral", "secondary", "accent", "info", "success", "warning", "error"] }],
      noBtn: ["btn", "-btn"],
      bg: [{ bg: ["base-content", "none"] }],
    },
    // ↓ Here you can define additional conflicts across class groups
    conflictingClassGroups: {},
    // ↓ Define conflicts between postfix modifiers and class groups
    conflictingClassGroupModifiers: {},
  },
});
