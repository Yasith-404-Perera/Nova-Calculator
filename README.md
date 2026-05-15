# NOVA — Next-Generation Calculator

## Product Vision

NOVA is a reimagined calculator as a premium creative workspace. Not an app with buttons, but a thoughtful tool that feels like an extension of the mind — fast, beautiful, and intelligent without getting in the way.

**Tagline:** *Calculate beautifully.*

**Brand personality:** Minimal, warm, precise, premium, calm.

## Design Language

Glass morphism meets iOS-inspired refinement:

- **Frosted glass panels** with `backdrop-filter: blur()` for depth
- **Layered depth** — UI exists on floating planes, not a flat surface
- **Dynamic lighting** — subtle gradients and glows that respond to theme
- **Spring-physics animations** — buttons compress like real objects, results roll in smoothly
- **Monochromatic palette + a single accent** — clean, focused, timeless

## Theme System

| Mode | Behavior |
|------|----------|
| **Dark** | Deep backgrounds, frosted dark glass, soft glows, high contrast |
| **Light** | Bright frosted glass, subtle shadows, clean minimalism |
| **Auto** | Time-aware: sunrise (warm), daytime (bright light), sunset (warm dark), night (deep dark). Smooth animated transitions between modes. |

## Feature Set

| Tier | Features |
|------|----------|
| **Core** | Basic arithmetic, expression display, result display, backspace, clear, sign toggle, percentage |
| **Scientific** | sin, cos, tan, log, ln, sqrt, x², x³, xʸ, 10ˣ, 1/x, n!, π, e, degree/radian toggle, parentheses |
| **History** | Scrollable timeline, timestamps, click-to-restore, clear, localStorage persistence |
| **Memory** | M+, M−, MR, MC with visual indicator |
| **Converter** | Length, mass, temperature, volume, area, speed, time, digital storage |
| **Workspace** | Tabbed modes (Basic / Scientific / Converter), future: multiple named workspaces |
| **Innovations** | Calculation Timeline (visual chain of operations), Smart Format (auto-formats large numbers), Result Preview (expression updates live) |

## Architecture

```
┌─────────────────────────────────────┐
│         App Controller              │  script.js
│  ┌─────────┐ ┌───────┐ ┌────────┐  │
│  │  Theme   │ │  UI   │ │ History│  │
│  │  Engine  │ │ Engine│ │ Manager│  │
│  └─────────┘ └───────┘ └────────┘  │
│  ┌──────────────────────────────┐   │
│  │     Calculator Engine        │   │
│  │  ┌────────┐ ┌────────────┐   │   │
│  │  │ Parser │ │ Evaluator  │   │   │
│  │  │(Shunt. │ │ (RPN)      │   │   │
│  │  │ Yard)  │ │            │   │   │
│  │  └────────┘ └────────────┘   │   │
│  └──────────────────────────────┘   │
│  ┌────────┐ ┌──────────┐ ┌──────┐  │
│  │ Memory │ │ Converter│ │Animat│  │
│  └────────┘ └──────────┘ └──────┘  │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    │  View   │
    │ index   │
    │ style   │
    └─────────┘
```

## File Structure

```
calculator/
├── index.html       Entry point, semantic UI structure
├── style.css        All styles: glass morphism, theme system, responsive
├── script.js        All logic: engine, UI, theme, history, converter
├── manifest.json    PWA manifest for installability
├── PLAN.md          This document
└── AGENTS.md        OpenCode session guidance
```

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build step | None | Zero dependencies, instant launch, works offline by nature |
| JS architecture | Single-file modular | Keeps the project accessible; clear section boundaries via comments |
| Expression evaluation | Shunting-yard → RPN | Avoids `eval()`, handles precedence and functions correctly |
| Theming | CSS custom properties | Runtime theme switching without repaints; smooth `transition` on all properties |
| Persistence | localStorage | History and theme preference survive page reloads |
| PWA | manifest.json + SW | Installable, works offline, feels like a native app |

## Implementation Roadmap

### Phase 1 — MVP (current)
- Glass morphism UI with dark/light/auto themes
- Basic + scientific operations
- Expression display with live preview
- History with localStorage
- Memory system
- Keyboard shortcuts
- Responsive layout
- Spring-physics animations
- Unit converter

### Phase 2 — Advanced
- Graphing calculator
- Multiple workspaces (tabs)
- Calculation Timeline with branching
- Natural language input
- PWA full support
- Export/import data

### Phase 3 — Ecosystem
- Desktop app (Electron/Tauri)
- Cloud sync
- Plugin system
- Collaboration features
- Mobile apps
