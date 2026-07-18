# OpenSpec Delta Design — Builder UI/UX Overhaul & Advanced Interactivity

This document provides detailed design instructions and visual specifications for the implementation of the WYSIWYG builder overhaul and component changes.

---

## 1. Builder Top Header Refinements

### A. Layout Structure & Height
- Change the header container to a compact height of `h-12` (48px) or `h-14` (56px) using Tailwind utilities.
- Remove the redundant `"Diseño"` layout button/label from the header.
- Scaled-down elements to maximize canvas workspace.

### B. Device Viewport Sizes (Signals & Layouts)
The responsive mode selector now features four options bound to `responsiveMode` signal:
- `desktop`: Canvas rendered inside `w-full max-w-7xl mx-auto h-[calc(100vh-3.5rem)]`
- `tablet`: Canvas container constrained to `w-[768px] h-[calc(100vh-3.5rem)]`
- `mobile`: Canvas container constrained to `w-[375px] h-[calc(100vh-3.5rem)]`
- `mobile-landscape`: Canvas container constrained to `w-[812px] h-[375px] max-h-[calc(100vh-3.5rem)]` (Smartphone Landscape View)

### C. Publish Lock Logic
- Define computed signal: `isSaved = computed(() => !this.portfolioState.isDirty())`.
- Bind `isSaved()` directly to the `[disabled]` property of the "Publicar" action button.
- CSS classes for disabled state: `disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`.

---

## 2. Builder Left Sidebar (Toolbox)

### A. Collapsible State & Chevron Action
- Declare state signal: `sidebarCollapsed = signal<boolean>(false)`.
- The sidebar wrapper container dynamically scales width:
  `[class]="sidebarCollapsed() ? 'w-16' : 'w-72'"` with `transition-all duration-300 ease-in-out`.
- Add a floating toggle trigger: a circular button containing a Lucide Chevron icon (`chevron-left` when open, `chevron-right` when collapsed).

### B. Minified State Content
- When `sidebarCollapsed()` is true, hide all typography labels and descriptions using `*ngIf="!sidebarCollapsed()"`.
- Display ONLY 2D monochrome Lucide icons centered within the tool blocks:
  - Text Block: `lucide-type`
  - Image Block: `lucide-image`
  - Video Block: `lucide-video`
  - Columns Block: `lucide-columns`
  - Slider Block: `lucide-sliders`
  - Menu Block: `lucide-navigation`
  - Social Block: `lucide-share-2`

### C. Canvas Background Overlay Contrast Fix
- The dark overlay covering the background image must correctly apply transparency dynamically:
  ```html
  <div class="absolute inset-0 bg-brand-charcoal transition-opacity duration-300"
       [style.opacity]="bgOverlayOpacity()"></div>
  ```
- Ensure `bgOverlayOpacity()` values are mapped directly to this property, clamping to a minimum value of `0.35` (35%) to maintain readability and AAA level contrast.

---

## 3. Portfolio View Layout (WYSIWYG/Public)

### A. Sticky and Shrinking Header (Desktop)
- Listen to the window scroll events:
  ```typescript
  isScrolled = signal<boolean>(false);
  
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scroll = window.scrollY || document.documentElement.scrollTop;
    this.isScrolled.set(scroll > 60);
  }
  ```
- Apply dynamic size classes:
  - Standard (top): `h-20 py-4 bg-transparent border-b border-transparent`
  - Scrolled: `h-12 py-2 bg-brand-papel/95 backdrop-blur shadow-sm border-b border-brand-charcoal/10`
- Integrate `transition-all duration-300 ease-in-out` on the header elements.

### B. Fixed Footer Layout
- Fix the footer container at the bottom of the viewport:
  `class="fixed bottom-0 left-0 right-0 z-30 border-t border-brand-charcoal/10 bg-brand-papel py-3 px-6 flex items-center justify-between shadow-md"`
- Ensure the main body layout contains a matching bottom padding to prevent overlay issues: `pb-20 md:pb-24`.

---

## 4. Portfolio Menu Component

### A. UI Label Cleanups
- Replace raw hashes from visual displays. Render the clean text labels (`link.label`) in the menu list templates, hiding raw anchors like `#inicio` or `#contacto`.

### B. Native HTML5 Drag & Drop List Reordering
- Apply `draggable="true"` to each menu link list item.
- Capture drop indices and update the link array sequence.
- **Sync mechanism**: The order of these items dictates the layout order of horizontal slides. Whenever the menu items are reordered, invoke a slide synchronization sequence:
  ```typescript
  syncSlidesWithMenu() {
    const orderedKeys = this.menuLinks().map(link => link.anchor);
    // Sort slides or blocks array matching the order of anchors
  }
  ```

---

## 5. Slide/Carousel Component Logic & UI

### A. Opacity and Layer Stacking Visibility
- Fix the CSS overlay issues:
  - Place background image and dark filter overlay in z-index container: `z-0`.
  - Put actual inner slide content (headers, cards, texts) inside a relative container at `z-10`.
  - Ensure slide elements are not affected by any unwanted opacity filters applied to outer wrappers.

### B. Autoplay Cycle (Signals & Intervals)
- Add autoplay controls to the slider state block:
  - `sliderAutoplayInterval = signal<number>(3); // 3s, 6s, 9s, 0 = disabled`
- Component lifecycle management:
  ```typescript
  autoplayTimer: any = null;
  
  initAutoplay() {
    this.clearAutoplay();
    const delay = this.sliderAutoplayInterval();
    if (delay === 0) return;
    
    this.autoplayTimer = setInterval(() => {
      const next = (this.activeSlideIndex() + 1) % this.slides().length;
      this.activeSlideIndex.set(next);
    }, delay * 1000);
  }
  
  clearAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
    }
  }
  ```

---

## 6. Canvas Element Manipulation (Drag, Drop & Resize)

### A. Position & Size Attributes (Types)
Extend the database and visual block models to hold bounds coordinates:
```typescript
export interface PortfolioBlock {
  // ...
  positionX?: number; // X coordinate in pixels
  positionY?: number; // Y coordinate in pixels
  width?: number;      // Width in pixels
  height?: number;     // Height in pixels
}
```

### B. Free-form Drag Coordinates
- Target absolute container styles on the canvas:
  ```html
  <div class="absolute cursor-move select-none"
       [style.left.px]="block.positionX || 0"
       [style.top.px]="block.positionY || 0"
       [style.width.px]="block.width || 200"
       [style.height.px]="block.height || 100">
  ```
- Listen to Mouse/Touch move deltas to dynamically update `positionX` and `positionY`.

### C. Selection Bounding Box & Resizing Handles
- Render active borders when `selectedBlockId === block.id`.
- Add 8 absolute coordinate handles: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top`, `bottom`, `left`, `right`.
- Track handle drag events:
  - Dragging `right` handle increases `width` value.
  - Dragging `bottom` handle increases `height` value.
  - Dragging `left` / `top` modifies both size (`width`/`height`) and position (`positionX`/`positionY`) to keep coordinates correct.

---

## 7. Rich Text Editor absolute Floating Toolbar

### A. Tooltip Positioning
- Tooltip container styles: `absolute z-50 -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-brand-charcoal text-brand-papel px-2 py-1.5 rounded-lg shadow-xl`.
- Hide automatically when the element loses focus or clicking outside the active bounding box.

### B. Standard Rich Text Icons
Provide Lucide monochrome outline actions:
- **Bold**: `bold` icon. Toggle `fontWeight` between `bold` and `normal`.
- **Italic**: `italic` icon. Toggle `fontStyle` between `italic` and `normal` (add `fontStyle?: 'italic' | 'normal'` to type specification).
- **Font Family**: `font` icon. Toggle `fontFamily` between `serif` and `sans`.
- **Text Alignment**: `align-left`, `align-center`, `align-right`, `align-justify` icons. Sets `textAlign` selection.
