---
version: 1
slug: "app-tabs-layout-tsx"
primary_target: "app/(tabs)/_layout.tsx"
related_targets: []
---

# Carousel Spec: El Índice Físico

Status: approved for implementation before code. Do not copy this contract into shipping source comments.

Scope: `app/(tabs)/_layout.tsx` navigation carousel only.

## Thesis
Replace the large emoji-card, horizontally gliding carousel with a compact physical index-card segmented control. The old pattern reads as detached floating cards and spends too much motion and space on navigation. The new pattern is one tray of equal filing cards: quiet at rest, explicit when selected.

## Layout
- Tray: `surfaceSecondary` (`#f1f3f4` light / `#2d2d2d` dark), 1px `border` hairline, radius 12, padding 4, horizontal margin 16, vertical rhythm 16–20.
- Cards: four equal `flex: 1` slots, gap 6, min height 48–52, radius 8, padding horizontal 8–10, vertical 10.
- Content: small emoji glyph (16px) or existing icon role above label; label 12px/600, line-height 16; caption `Próximamente` 11px/500, line-height 14, only for Pomodoros.
- Widths: tray never stretches beyond content area; on wide widths it stays centered and ≤600px.

## Visual states
- Inactive: `paper` (`colors.background`) fill, 1px hairline border, `ink-soft` text, no shadow, full heptop? (no scale interpolation), opacity handled by selected state only.
- Active: `sangre-seca` fill, `onPrimary` text, 3px bottom edge in `sangreo-profundo`/`primaryPressed`, Lift Active shadow (`0 4px 12px`, opacity 0.30, tint `primaryPressed`), translateY(-2px).
- Pressed/active: `sangre-profundo` fill or bottom edge deepens; no scale gimmicks; translateY returns to 0 while pressed.
- Disabled Pomodoros: paper fill, `textTertiary` label, opacity 0.5, disabled accessibility state; not selectable.
- Focus: visible 1–2px `focusRing` outline; never glow.

## Motion
- 180ms ease-out cubic-bezier(0.16, 1, 0.3, 1) for state changes.
- No horizontal glide, no 500ms interpolation, no font-size swap.
- Animate only opacity and translateY/shadow; honor reduced motion with crossfade.

## Accessibility
- Role: tray `tablist`; each card `tab`; selected state via `accessibilityState={{ selected }}`; Pomodoros `disabled: true`.
- Labels: localized Spanish; Pomodoros label includes Próximamente or spoken hint.
- Touch targets: ≥44×44pt/dp; 8dp separation via tray gap.

## Implementation notes
- Use theme tokens only; no raw hex in screens.
- Replace Animated inputRange/scale/translateX carousel with single selected-index animation or direct state + LayoutAnimation/Animated timing.
- Keep Spanish copy and emoji-as-icon role from incumbent system.
- Do not reintroduce iOS blue or heavy drop shadows at rest.
