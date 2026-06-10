# Ecdysis Design System

## 1. Color Tokens
- `--ds-primary`: `#D57B0E` (Primary CTA)
- `--ds-bg`: `#F4E2D0` (Global background)
- `--ds-accent`: `#3A5635` (Navigation and structure)
- `--ds-surface`: soft card background
- `--ds-surface-strong`: elevated card background
- `--ds-text`: primary text
- `--ds-text-muted`: secondary text
- `--ds-border`: subtle borders

## 2. Typography Hierarchy
Todo usa **General Sans** (servida localmente desde `/public/fonts/`).
Pesos disponibles: 200, 300, 400, 500, 600, 700 (cada uno con itálica).
- `ds-h1`, `ds-h2`, `ds-h3`: títulos editoriales (General Sans, weight 500)
- `ds-subtitle` y `ds-description`: copy de soporte (General Sans, weight 500)
- `ds-micro` y `ds-field-label`: helper/meta (General Sans, weight 600 uppercase)

## 3. Spacing Scale (8pt Grid)
- `--ds-space-1`: 8px
- `--ds-space-2`: 16px
- `--ds-space-3`: 24px
- `--ds-space-4`: 32px
- `--ds-space-5`: 40px

## 4. Radius System
- `--ds-r-sm`: 12px
- `--ds-r-md`: 20px
- `--ds-r-lg`: 28px
- `--ds-r-pill`: 999px

## 5. Elevation and Shadows
- `--ds-shadow-1`: soft floating cards
- `--ds-shadow-2`: bottom navigation and major overlays

## 6. Motion Principles
- 180ms ease for touch feedback on pills and buttons
- 220ms ease for focus and elevation transitions
- Subtle scale interaction on press (`scale(0.98)`)
- Smooth bottom floating surfaces for sticky CTA and nav

## 7. Component Library
- `AppShell`
- `FloatingCard`
- `Tabs`
- `PrimaryButton`
- `SecondaryButton`
- `GhostButton`
- `TextField`
- `SelectField`
- `EditorialWorkoutCard`
- `BookingPanel`
- `DatePills`
- `ProgressRing`
- `BottomNavigation`
- `StickyBottomCTA`

## 8. UI Rules
- All screens must use design-system components and tokens only.
- Do not add ad-hoc colors, spacing, radius, or shadows in screen files.
- Keep edge-to-edge hero sections and floating card surfaces.
- Use card-based grouping for every interaction.
- Use sticky bottom CTA and bottom nav where relevant.
