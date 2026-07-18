# OpenSpec Delta Checklist — Tasks

A list of actionable tasks to apply the Builder UI/UX Overhaul & Advanced Interactivity specification:

## Task 1: Builder Top Header Refinements
- [ ] Remove the `"Diseño"` action button next to the logo in `session.component.html`.
- [ ] Scale down the header elements and reduce the header container height class (e.g. from `h-20`/`h-16` to `h-12`).
- [ ] Add the 4th preview state `mobile-landscape` in `session.component.html` and `session.component.ts`.
- [ ] Update `PortfolioStateService` responsive modes typing to support `'mobile-landscape'`.
- [ ] Add the `isSaved` computed signal to `session.component.ts` (bound to `isDirty` state).
- [ ] Bind the "Publicar" button `disabled` attribute to the `isSaved` signal.

## Task 2: Collapsible UI Sidebar (Toolbox)
- [ ] Add the `sidebarCollapsed` boolean signal to `session.component.ts`.
- [ ] Place a floating retraction toggle button with a Lucide Chevron icon next to the left sidebar.
- [ ] Implement style bindings to change the sidebar class from `w-72` to `w-16` when collapsed.
- [ ] Hide text labels and descriptions inside the sidebar under `*ngIf="!sidebarCollapsed()"`.
- [ ] Display Centered monochrome Lucide icons for text, image, video, columns, slider, menu, and social blocks when collapsed.
- [ ] Fix the `'Opacidad Filtro'` slider binding so `bgOverlayOpacity()` correctly updates the dark filter opacity.

## Task 3: Sticky Header & Fixed Footer Parity
- [ ] Implement `HostListener('window:scroll')` in portfolio components to track scroll offset and set `isScrolled`.
- [ ] Add transition classes to headers so they shrink cleanly on desktop scroll.
- [ ] Refactor the footer element to remain fixed at `bottom-0` of the screen view.
- [ ] Add responsive margins/paddings on tablet and mobile viewports.
- [ ] Propagate layout classes to public views (`anuncios`, `buscar`, `inicio`).

## Task 4: Portfolio Menu Component
- [ ] Remove raw anchor names (like `#servicio`) from menu items display; show clean labels.
- [ ] Implement HTML5 native draggable attributes (`draggable="true"`) on builder menu links.
- [ ] Create `onMenuDragStart`, `onMenuDragOver`, and `onMenuDrop` event handler methods in the component.
- [ ] Write `syncSlidesWithMenu` logic to synchronize the list of horizontal slides to match the sequence of menu items.

## Task 5: Slide/Carousel Component Logic
- [ ] Adjust CSS z-index and nesting layers inside the slider component to keep content bright and crisp.
- [ ] Add `sliderAutoplayInterval` configuration to block properties.
- [ ] Set up `setInterval` autoplay triggers inside the slider component.
- [ ] Clear and restart timers during component initialization, updates, and destruction.

## Task 6: Free-form Canvas Element Manipulation (Drag, Drop & Resize)
- [ ] Add `positionX`, `positionY`, `width`, and `height` bounds properties to the `PortfolioBlock` model in `shared/types`.
- [ ] Bind canvas element position styles to `[style.left.px]`, `[style.top.px]`, `[style.width.px]`, and `[style.height.px]`.
- [ ] Implement dragging handler events (`mousedown`, `mousemove`, `mouseup`) to move blocks freely.
- [ ] Render selected block borders and add 8 drag handles at corners/edges.
- [ ] Implement resizing calculations on mouse movement deltas.

## Task 7: Word-Style Text Editor Floating Toolbar
- [ ] Render the absolute text formatter toolbar tooltip above clicked text components.
- [ ] Include Lucide icon actions for Bold (weight), Italic (style), Serif/Sans (family), and text alignment selection.
- [ ] Bind click events on the toolbar to update active block signal properties.
