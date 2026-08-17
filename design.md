# ARANDU - DESIGN SYSTEM & UI CONSTRAINTS
## 1. STRICT TECHNICAL CONSTRAINTS
- **Styling Engine:** Use TailwindCSS exclusively. Custom CSS files or inline styles (`style="..."`) are strictly FORBIDDEN.
- **Icons:** Use ONLY "Lucide" or "Phosphor" icons (2D, outline, monochrome). Emojis, SVGs from other libraries, and 3D icons are strictly forbidden.
- **Scroll Discipline:** Use `overflow-x-hidden` on the main wrapper. Nested scrollbars are not allowed.
## 2. BRAND TOKENS (DARK THEME ONLY)
Arandu is a premium, dark-themed platform.
- **Backgrounds:** Use `bg-slate-950` (#020617) for the main canvas, and `bg-slate-900` (#0f172a) for elevated cards or sidebars.
- **Text/Typography:** Use `text-slate-200` for primary text and `text-slate-400` for secondary text. Font family must be standard sans-serif (Inter/system-ui).
- **Accents/Primary Action:** Use elegant, subdued accents like `bg-indigo-600` or `bg-blue-600` for primary buttons.
- **Borders:** Use `border-slate-800` for subtle structural dividers.
## 3. COMPONENT & UX BEHAVIOR
- **Minimalism:** The UI must be clean. Use white space generously (`p-6`, `gap-4`, `gap-6`).
- **Touch Ergonomics (Mobile-First):** All clickable elements (buttons, icons) must have a minimum touch target area of 44x44px (e.g., `min-h-[44px] min-w-[44px]`).
- **Floating Toolbars (In-Place Editor):** Do NOT create global "Design" buttons in main headers. Text editing tools (Font family, weight, hex color) MUST be rendered as Floating Tooltips (`absolute`, `z-index-50`, `shadow-xl`, `bg-slate-800`) positioned directly above the currently active/clicked element.
- **Canvas Backgrounds:** Any background image applied to a canvas area must automatically render a dark overlay wrapper (e.g., `bg-black/60` or `bg-black/80`) to guarantee AAA text contrast.
