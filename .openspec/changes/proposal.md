# OpenSpec Delta Proposal — Builder UI/UX Overhaul & Advanced Interactivity

## 1. Objective
Refactor the visual portfolio builder workspace, sidebar toolbox, page layouts, dynamic menu slides, and text toolbars to establish a premium, fully-customizable WYSIWYG drag-and-resize experience within the Arandu workspace.

---

## 2. Problem Statement
The current visual editor lacks standard design capabilities:
1. **Workspace Clutter**: Top header is too tall, has redundant buttons ("Diseño" next to logo), and lacks landscape smartphone testing viewport.
2. **Rigid Canvas Layout & Static Boxes**: Elements cannot be positioned arbitrarily on the canvas, nor can they be resized by dragging edges.
3. **Component Limitations**:
   - Menu items and slides are disjointed (reordering menu links does not update slide sequence).
   - Slides suffer from poor overlay z-index rendering (dimmed/opaque content).
   - Slides lack auto-scroll intervals.
   - The absolute text editing tooltip is too basic (lacks justify align, bold/italic toggles, custom family settings).

---

## 3. Proposed Solution

### Task 1: Header Optimization & Saved Status
- Shrink header height to `h-12` / `h-14` and remove the redundant "Diseño" button.
- Introduce `mobile-landscape` viewport preset (4th preview device).
- Add `isSaved = computed(() => !this.portfolioState.isDirty())` signal and bind it to the "Publicar" button's `disabled` attribute.

### Task 2: Collapsible Tool Sidebar & Opacity Repair
- Provide a collapsible state signal for the builder sidebar (`sidebarCollapsed = signal(false)`).
- Render icons-only monochrome view when collapsed.
- Bind `bgOverlayOpacity()` to the alpha channel of the overlay div background style to avoid double opacity rendering bugs.

### Task 3: Sticky Portfolio Header & Fixed Footer
- Add custom sticky and shrinking transition effects to the portfolio header.
- Fix social footer component to the viewport bottom with correct media responsive scaling.

### Task 4: Drag-and-Drop Menu Links & Auto Slide Sync
- Strip `#` hashes from the template view of menu links.
- Implement HTML5 drag-and-drop list handlers. Reordering items automatically synchronizes slide layout arrays.

### Task 5: Crisp Slide Visibility & Interval Autoplay
- Optimize slide z-indices to prevent text dimming under dark overlay background.
- Implement autoplay service timer using an interval config signal (`0s`, `3s`, `6s`, `9s`).

### Task 6: Free-form Canvas Drag-Drop & Resize Bounding Box
- Add `positionX`, `positionY`, `width`, and `height` properties to `PortfolioBlock` interfaces.
- Create dynamic selection bounding box with drag handlers on corners and borders.

### Task 7: Word-Style Text Toolbar
- Display rich-text style floating format bar with Lucide outline buttons for Bold, Italic, Serif/Sans, and Left/Center/Right/Justify alignment.

---

## 4. OpenSpec Conformance
- **Tailwind Only**: No custom styles; all formatting uses standard utility classes.
- **Vanilla TS/JS**: Native mouse/touch event listeners are used for drag/resize to avoid adding complex external npm dependencies.
- **Strict DOM Parity**: The public renderer implements identical style and overlay formulas to match editor visual changes.
