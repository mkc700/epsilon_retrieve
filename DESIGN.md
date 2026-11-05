---
name: Epsilon Retrieve
description: Un cuaderno rojo digital — quick-capture notes, todos and agenda in one calm, archival workspace (Spanish-first, iOS/Android/Web)
colors:
  paper: "#ffffff"
  folio: "#f8f9fa"
  folio-deep: "#f1f3f4"
  ink: "#1a1a1a"
  ink-soft: "#5f6368"
  ink-faint: "#9aa0a6"
  sangre-seca: "#a12624"
  sangre-wash: "#f5e4e4"
  sangre-profundo: "#4a100f"
  hairline: "#e0e0e0"
  error: "#dc3545"
  success: "#28a745"
  warning: "#ffc107"
  disabled: "#c4c4c4"
typography:
  display:
    fontFamily: "System (San Francisco on iOS, Roboto on Android)"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "System (San Francisco on iOS, Roboto on Android)"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.5px"
  title:
    fontFamily: "System (San Francisco on iOS, Roboto on Android)"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.5px"
  body:
    fontFamily: "System (San Francisco on iOS, Roboto on Android)"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label:
    fontFamily: "System (San Francisco on iOS, Roboto on Android)"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.2px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.sangre-seca}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary-pressed:
    backgroundColor: "{colors.sangre-profundo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px"
  button-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px"
  input-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  card-surface:
    backgroundColor: "{colors.folio}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  pill-filter:
    backgroundColor: "{colors.folio-deep}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  pill-filter-active:
    backgroundColor: "{colors.sangre-seca}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  modal-content:
    backgroundColor: "{colors.folio}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Epsilon Retrieve

## Overview

**Creative North Star: "El Cuaderno Rojo"**

Epsilon Retrieve is a working notebook, not a showcase. The system is tuned for *preciso y archivero* — precise and archival — a surface that behaves like a well-kept card index: everything filed, everything legible, nothing shouting. The deep oxblood (`sangre-seca`) is the thread that stitches notas, tareas and agenda into one object; it appears where a hand would reach for the red pen, and almost nowhere else. Density is moderate, rhythm is calm, and the interface recedes behind the capture task.

Elevation is **softly lifted**: surfaces rest on hairline borders and tonal layering, and shadows are reserved for things that genuinely float — the active tab, modals, floating layers — where they read as ambient lift rather than decoration. Components are **suave y acogedor** (soft and welcoming): generous 8–16px radii, forgiving contrast, rounded affordances that feel approachable rather than institutional.

Confirmed anti-reference: the **generic iOS-blue clone**. The tab carousel and header in `app/(tabs)/_layout.tsx` hardcode `#007AFF` / `#FF3B30` / `#fff`, bypassing the theme entirely; that look is explicitly rejected. The red system owns the accent.

**Key Characteristics:**
- Spanish-first UI copy; the notebook metaphor is literal, not decorative
- One accent (`sangre-seca`), used with archival restraint
- Flat at rest; hairline borders and tonal layers do the separating; shadows only for floating layers
- System typography (SF on iOS, Roboto on Android); no custom brand face
- Generous radii (8/12/16px), 44pt-class touch targets, accessibility labels throughout
- Dark scheme is first-class and paired 1:1 with the light scheme via `useTheme()`

## Colors

A restrained, archival palette: warm paper neutrals, one oxblood voice, and a small functional status set. The frontmatter records the **light (default) scheme**; the dark scheme is paired token-by-token below and both ship through `ThemeContext.tsx`.

### Primary
- **Sangre Seca** (#a12624): The single accent. Primary buttons, the active tab, checked states, focus ring, links, and the active filter pill. Its rarity is the point — it marks *the* action on a screen.
- **Sangre Wash** (#f5e4e4): The red's resting tint. Subtle fills, hover washes, and the light-scheme companion of `primaryLight`.
- **Sangre Profundo** (#4a100f): The ink of the red. Pressed/active states and the deepest tonal step; in the dark scheme it pairs as `primaryLight`.

### Secondary
- (None. The system deliberately has a single accent; status colors are functional, not decorative.)

### Tertiary
- (None.)

### Neutral
- **Paper** (#ffffff): App background in the light scheme; the sheet the notebook is written on.
- **Folio** (#f8f9fa): Card and header surfaces; the archival folio leaf sitting on the paper.
- **Folio Deep** (#f1f3f4): Secondary surfaces — inactive pills, secondary buttons, cancel rows.
- **Ink** (#1a1a1a): Primary text; near-black, softened from pure #000 for long reading.
- **Ink Soft** (#5f6368): Secondary text — metadata, descriptions, helper copy.
- **Ink Faint** (#9aa0a6): Tertiary text — placeholders, empty-state hints, timestamps' quieter siblings.
- **Hairline** (#e0e0e0): 1px borders and dividers; the only line the system draws.

### Status (functional, never decorative)
- **Error** (#dc3545): Destructive actions, auth errors, the delete affordance.
- **Success** (#28a745): Low priority badge, success modal header, confirmation.
- **Warning** (#ffc107): "Sin sincronizar" badges, medium priority. Always paired with Ink text for contrast.
- **Disabled** (#c4c4c4): Disabled controls; replaces the primary fill when a button is inert.

### Dark scheme (paired, ships via `useTheme()`)
- Background **#121212** / surface **#1e1e1e** / surface-secondary **#2d2d2d**; text **#e8e8e8** / secondary **#a0a0a0** / tertiary **#6b6b6b**; border **#3d3d3d**; disabled **#4a4a4a**.
- Status lifts for dark: error **#ff6b6b**, success **#4ade80**, warning **#fbbf24**.
- The red family stays constant in hue but swaps roles: `primary` remains **#a12624**; `primaryLight` → **#4a100f**, `primaryDark` → **#f5e4e4** (the light tint becomes the legible-on-dark companion). `focusRing` lifts to **#d16765** so keyboard focus keeps ≥3:1 against dark surfaces.

### Named Rules
**The Sangre Rule.** Sangre Seca appears on ≤10% of any given screen. If two elements on a screen compete for it, one of them is wrong.
**The Hairline Rule.** Separation is drawn with 1px Hairline borders or tonal steps (Paper → Folio → Folio Deep), never with heavy strokes or drop shadows at rest.

## Typography

**Display Font:** System sans (San Francisco on iOS, Roboto on Android)
**Body Font:** Same stack — the system has no display/body split, and no custom face is licensed or desired.
**Label/Mono Font:** Same stack; labels differentiate by weight and size, not family.

**Character:** One voice, four weights of emphasis. The system relies on tight tracking (-0.5px on headings) and weight contrast (400/600/700) rather than a second family. It reads as a well-set index card: quiet, dense enough to work, airy enough to breathe.

### Hierarchy
- **Display** (700, 32px, 1.2, −0.5px): Auth screen title ("Epsilon Retrieve") and other once-per-flow declarations. Appears only where a session begins.
- **Headline** (700, 24px, 1.25, −0.5px): Screen header titles — Notas, Tareas, Agenda. One per screen, always centered between back affordance and add action.
- **Title** (700, 20px, 1.3, −0.5px): Modal titles, context-menu headers, section heads inside cards' detail views.
- **Body** (400, 16px, 1.5): Inputs, list item content, screen body copy. Note content steps down to 15px/22px line-height for density; keep measure ≤ 65–75ch.
- **Label** (600, 12px, 1.3, +0.2px): Badges, pill filters, tab labels, button captions, priority tags. Caption floor is 10–11px (priority badges, sync badges) and never below 11px for meaningful text.

### Named Rules
**The One Family Rule.** No second typeface enters the system. Emphasis comes from weight, size and tracking — never from a decorative face.
**The Tight Heading Rule.** All headings carry −0.5px letter-spacing; body and labels stay at 0 or +0.2px.

## Layout

The spatial model is a **single-column, safe-area-aware app shell**: a top header bar (surface, 1px bottom hairline, 20px horizontal / 15–16px vertical padding), an optional filter/pill row, then a full-bleed scrolling list or form with 16px content padding. Auth screens center their column with 24px padding and a max comfortable measure.

- **Screen gutters:** 16px for list/content areas; 20px for header bars; 24px for auth and modal content.
- **Vertical rhythm:** 8 / 12 / 16 / 20 / 24px steps; cards separate by 12px bottom margin; section gaps rarely exceed 24px.
- **Header pattern:** back affordance (15px/600, text role) — centered title (24px/700) — trailing action ("＋" add button, 8px radius, sangre-seca fill).
- **Tab carousel:** horizontally centered pill tabs (emojis + labels), active tab lifts via scale/opacity interpolation (see Motion); it is a navigation surface, not decoration.
- **Responsive:** phone-first. On wider widths, content max-width should stay ≤ 600px centered; the carousel should not stretch. (Tablet treatment is undecided; do not improvise a rail.)
- **Density:** moderate. Lists are the primary canvas; empty states center a 18px/500 line plus a 14px sub-line, 60px vertical padding.

## Elevation & Depth

Softly lifted, never floaty. Depth is conveyed in three tiers: (1) tonal layering — Paper < Folio < Folio Deep — for resting surfaces; (2) 1px Hairline borders for cards and inputs; (3) ambient shadows only on genuinely floating layers — the active tab, the modal container, the carousel buttons at rest.

### Shadow Vocabulary
- **Ambient Low** (`shadow-offset 0 2px, shadow-opacity 0.10, shadow-radius 8px, elevation 5`): Tab carousel buttons at rest; the smallest lift.
- **Lift Active** (`shadow-offset 0 4px, shadow-opacity 0.30, shadow-radius 12px, elevation 8`): The active tab only. In code this is currently tinted with the off-system `#007AFF`; the normative tint is `sangre-profundo`.
- **Modal Raised** (`shadow-offset 0 2px, shadow-opacity 0.25, shadow-radius 3.84px, elevation 10`): Modal containers over the 0.5 black scrim (`rgba(0,0,0,0.5)`).

No shadow is ever applied to list cards, inputs or pills at rest.

### Named Rules
**The Float Rule.** A shadow means "this floats above the page." If a surface is part of the page's reading order, it stays flat and bordered.
**The Scrim Rule.** Modals always sit on a 0.5 black scrim; never on a blurred or translucent backdrop.

## Shapes

The form language is rounded-rect with a clear hierarchy of corner radii — **8px** for controls (inputs, buttons, add buttons, secondary modal buttons), **12px** for content containers (note/todo/agenda cards, context menus, inline modals), **16px** for elevated dialogs (`CustomModal`), **20px** pill for filters/logout/priority badges, and **4px** for micro-badges (sync state). Checkboxes are full circles (12px radius on 24px box).

Borders are always 1px Hairline. Clipping: modal containers clip (`overflow: hidden`) so their colored headers meet the radius. No cutouts, no chamfers, no outline icons — emoji glyphs carry the icon role throughout the app.

### Named Rules
**The Radius Ladder Rule.** 4 → 8 → 12 → 16 → 20(pill). Never introduce an intermediate radius; pick the nearest rung.

## Components

Components are suave y acogedor: filled where an action lives, quiet where it doesn't, always with visible affordance. All colors reference theme tokens via `useTheme()`; hardcoded hex in screens is a defect.

### Buttons
- **Shape:** 8px radius (pill 20px reserved for compact filters/logout)
- **Primary:** `sangre-seca` fill, white 600-weight label, 16px vertical / generous horizontal padding; auth CTA full-width at 16px padding, 16px radius on the modal-scale variant.
- **Pressed / Active:** shift to `sangre-profundo`; no scale gimmicks on buttons (the tab carousel owns the only sanctioned scale animation).
- **Disabled:** fill swaps to `disabled`; label stays white; `accessibilityState={{disabled: true}}` required.
- **Ghost / Cancel:** `folio-deep` (or `border` in dark) fill with Ink text.

### Chips / Pills (filter)
- **Style:** `folio-deep` background, `ink-soft` 14px/600 text, 20px radius, 10px vertical padding; equal `flex: 1` thirds in the All/Active/Completed row.
- **State:** active pill flips to `sangre-seca` fill with white text; no outline state.

### Cards / Containers
- **Corner Style:** 12px radius
- **Background:** `folio` with 1px `hairline` border; on the dark scheme, `#1e1e1e` on `#3d3d3d`.
- **Shadow Strategy:** none at rest (see Elevation)
- **Internal Padding:** 16px; 12px bottom margin between list cards
- **Completed state (todos):** opacity 0.6 + strikethrough on the title — dims, never recolors

### Inputs / Fields
- **Style:** Paper background, 1px Hairline border, 8px radius, 14–16px padding, 16px text; placeholder in `ink-faint`.
- **Focus:** border and/or `focusRing` (= `sangre-seca`) — a visible 1–2px ring; never a glow.
- **Error:** message in `error` below the field, centered 14px/500; field border may adopt `error`.
- **Multiline:** `textAlignVertical: top`, 120px min height for note bodies.

### Priority badges (todos)
- **Style:** 10px/600 uppercase text on a 20%-opacity tint of its semantic color (`error`/`warning`/`success`), 12px radius, 10×4px padding.

### Sync badge ("Sin sincronizar")
- **Style:** `warning` fill, Ink text, 11px, 4px radius, 8×3px padding. The only badge allowed to interrupt a card.

### CustomModal (signature)
- **Anatomy:** colored header band (`sangre-seca` for info, `success`, `error`) with a 32px white glyph + 20px/700 white title (−0.5px), Paper/Folio body with 16px message at 1.5 line-height, full-width `sangre-seca` OK button. 16px radius, clipped, Modal Raised shadow, spring-in (friction 8 / tension 40).
- **Use:** blocking confirmations and auth feedback only; inline errors stay inline.

### Navigation
- **Header bar:** `folio` surface, 1px bottom hairline; title 24px/700 centered; back in 15px/600; add action is a sangre-seca 8px-radius chip with 14px/600 white label.
- **Tab carousel:** the app's primary navigation; active tab = sangre-seca fill + white label + Lift Active shadow; inactive = white/folio fill, `#666`-class muted label at 0.4 opacity; "Pomodoros" renders at 0.5 opacity with "(Próximamente)" and is disabled. Carousel animates over 500ms with useNativeDriver.

## Do's and Don'ts

### Do:
- **Do** route every color through `useTheme()` tokens; add a new token to `ThemeContext.tsx` before using a new value anywhere.
- **Do** keep Sangre Seca ≤10% of any screen — one primary action, one active state, nothing else.
- **Do** separate surfaces with Paper → Folio → Folio Deep tonal steps and 1px Hairline borders.
- **Do** reserve shadows for floating layers (active tab, modal); everything in the reading order stays flat.
- **Do** keep the Radius Ladder: 4 / 8 / 12 / 16 / 20(pill); nearest rung wins.
- **Do** write UI copy in Spanish, sentence case, with direct verbs ("Guardar", "Cancelar", "Iniciar Sesión").
- **Do** pair `warning` fills with dark text and keep all status colors functional, never ornamental.
- **Do** keep headings at −0.5px tracking and body at 0/+0.2px; one typeface, weight does the work.
- **Do** provide `accessibilityLabel` / `accessibilityRole` on every touchable; the codebase already does — don't regress it.

### Don't:
- **Don't** hardcode `#007AFF`, `#FF3B30`, `#fff`, `#666`, `#999` or any raw hex in screens — `app/(tabs)/_layout.tsx` currently does this and is the canonical defect to fix, not to imitate.
- **Don't** introduce a second accent, gradient, glow, or glassmorphism; the world is paper, folio and one red.
- **Don't** apply shadows to list cards, inputs or pills at rest.
- **Don't** use Pure Black (#000) for text or borders; use Ink and Hairline.
- **Don't** drop below 11px for meaningful text or below 44×44pt for touch targets.
- **Don't** add a display/serif/mono face; the One Family Rule is absolute.
- **Don't** recolor completed todos — dim with opacity and strikethrough only.
- **Don't** invent new radii between rungs, or pill-shaped primary buttons (pill is for filters and the logout chip).
- **Don't** bypass `CustomModal` with `Alert.alert` for in-flow success/error feedback where the modal pattern already exists.
