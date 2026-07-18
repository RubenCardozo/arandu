# OpenSpec Delta Specifications — File Mutations

This document details the exact file-by-file changes (Delta Specs) required to implement the UI/UX overhaul and visual interactivity.

---

## 1. Shared Types Module

### [MODIFY] [shared/types/index.ts](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/shared/types/index.ts)
Ensure the `PortfolioBlock` model includes properties for free-form drag/drop/resize bounds, slider autoplay, text formatting attributes, and style options:
```typescript
export interface PortfolioBlock {
  id: string;
  type: 'text' | 'video' | 'image' | 'layouts' | 'social' | 'menu' | 'slider' | 'columns';
  content?: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  fontFamily?: 'serif' | 'sans' | 'mono' | 'geometric' | 'elegant';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  mediaUrl?: string;
  mediaType?: 'youtube' | 'vimeo' | 'image';
  layoutCols?: number;
  columns?: {
    blocks: PortfolioBlock[];
  }[];
  menuLinks?: {
    label: string;
    anchor: string;
  }[];
  sliderSlides?: {
    url: string;
    text: string;
  }[];
  sliderAutoplayInterval?: number; // Autoplay interval in seconds (0 = disabled, 3, 6, 9)
  socialLinks?: {
    whatsapp?: string;
    email?: string;
    website?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    x?: string;
    youtube?: string;
  };
  // Drag & drop coordinates and size bounds
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}
```

---

## 2. Portfolio State Service

### [MODIFY] [portfolio-state.service.ts](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/services/portfolio-state.service.ts)
- Support `'mobile-landscape'` in the responsive modes signal.
- Provide state management for the saved state signal or dirty check.
- Provide helper methods to clean properties and enforce default sizes for new elements.

```typescript
// L13: Update Responsive Mode typing
responsiveMode = signal<'desktop' | 'tablet' | 'mobile' | 'mobile-landscape'>('desktop');

// L32: Track isDirty for Publish Locking
isDirty = signal<boolean>(false);

// Add method to update dirty flag
markDirty() {
  this.isDirty.set(true);
}
markSaved() {
  this.isDirty.set(false);
}
```

---

## 3. Builder Visual Components (Session Component)

### [MODIFY] [session.component.ts](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.ts)
- Declare state signals for collapsible sidebar and formatting:
  ```typescript
  sidebarCollapsed = signal<boolean>(false);
  isSaved = computed(() => !this.portfolioState.isDirty());
  
  // Drag / Resize / Free-form states
  activeResizeHandle = signal<string | null>(null);
  selectedBlockId = signal<string | null>(null);
  isDraggingBlock = signal<boolean>(false);
  isResizingBlock = signal<boolean>(false);
  
  // Slide drag-reorder states
  draggedMenuIndex = signal<number | null>(null);
  ```
- Implement HTML5 Drag & Drop sorting for menu links:
  ```typescript
  onMenuDragStart(index: number, event: DragEvent) {
    this.draggedMenuIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  
  onMenuDragOver(index: number, event: DragEvent) {
    event.preventDefault();
  }
  
  onMenuDrop(index: number, event: DragEvent) {
    event.preventDefault();
    const sourceIdx = this.draggedMenuIndex();
    if (sourceIdx === null || sourceIdx === index) return;
    
    // Perform re-ordering
    const blocks = [...this.portfolioState.blocks()];
    const menuBlockIdx = blocks.findIndex(b => b.type === 'menu');
    if (menuBlockIdx === -1) return;
    
    const menuBlock = { ...blocks[menuBlockIdx] };
    if (!menuBlock.menuLinks) return;
    
    const links = [...menuBlock.menuLinks];
    const [movedLink] = links.splice(sourceIdx, 1);
    links.splice(index, 0, movedLink);
    
    menuBlock.menuLinks = links;
    blocks[menuBlockIdx] = menuBlock;
    
    // Sync slide sequence automatically
    this.syncSlidesWithMenuOrder(blocks, links);
    this.portfolioState.blocks.set(blocks);
    this.portfolioState.markDirty();
    this.draggedMenuIndex.set(null);
  }
  
  syncSlidesWithMenuOrder(blocks: PortfolioBlock[], links: any[]) {
    // Reorder slides/carousel cards based on corresponding anchor labels
    const sliderBlockIdx = blocks.findIndex(b => b.type === 'slider');
    if (sliderBlockIdx === -1) return;
    
    const sliderBlock = { ...blocks[sliderBlockIdx] };
    if (!sliderBlock.sliderSlides) return;
    
    // Sort slides matching the sequence of labels in menu links
    const sortedSlides = [...sliderBlock.sliderSlides].sort((a, b) => {
      const idxA = links.findIndex(l => l.label === a.text);
      const idxB = links.findIndex(l => l.label === b.text);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
    
    sliderBlock.sliderSlides = sortedSlides;
    blocks[sliderBlockIdx] = sliderBlock;
  }
  ```
- Implement Free-form Mouse Interactions:
  ```typescript
  // mouse coordinates tracking
  private dragStartX = 0;
  private dragStartY = 0;
  private blockStartX = 0;
  private blockStartY = 0;
  private blockStartWidth = 0;
  private blockStartHeight = 0;

  onBlockMouseDown(block: PortfolioBlock, event: MouseEvent) {
    if (this.isResizingBlock()) return; // Resize takes priority
    this.selectedBlockId.set(block.id);
    this.isDraggingBlock.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.blockStartX = block.positionX || 0;
    this.blockStartY = block.positionY || 0;
    
    event.stopPropagation();
  }

  onResizeHandleMouseDown(block: PortfolioBlock, handle: string, event: MouseEvent) {
    this.selectedBlockId.set(block.id);
    this.activeResizeHandle.set(handle);
    this.isResizingBlock.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.blockStartX = block.positionX || 0;
    this.blockStartY = block.positionY || 0;
    this.blockStartWidth = block.width || 300;
    this.blockStartHeight = block.height || 150;
    
    event.stopPropagation();
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    const activeId = this.selectedBlockId();
    if (!activeId) return;
    
    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;
    
    const blocks = [...this.portfolioState.blocks()];
    const blockIdx = blocks.findIndex(b => b.id === activeId);
    if (blockIdx === -1) return;
    const block = { ...blocks[blockIdx] };

    if (this.isDraggingBlock()) {
      block.positionX = Math.max(0, this.blockStartX + deltaX);
      block.positionY = Math.max(0, this.blockStartY + deltaY);
      blocks[blockIdx] = block;
      this.portfolioState.blocks.set(blocks);
      this.portfolioState.markDirty();
    } else if (this.isResizingBlock() && this.activeResizeHandle()) {
      const handle = this.activeResizeHandle();
      
      if (handle === 'right' || handle === 'bottom-right' || handle === 'top-right') {
        block.width = Math.max(80, this.blockStartWidth + deltaX);
      }
      if (handle === 'bottom' || handle === 'bottom-right' || handle === 'bottom-left') {
        block.height = Math.max(50, this.blockStartHeight + deltaY);
      }
      if (handle === 'left' || handle === 'bottom-left' || handle === 'top-left') {
        const potentialWidth = this.blockStartWidth - deltaX;
        if (potentialWidth >= 80) {
          block.width = potentialWidth;
          block.positionX = Math.max(0, this.blockStartX + deltaX);
        }
      }
      if (handle === 'top' || handle === 'top-right' || handle === 'top-left') {
        const potentialHeight = this.blockStartHeight - deltaY;
        if (potentialHeight >= 50) {
          block.height = potentialHeight;
          block.positionY = Math.max(0, this.blockStartY + deltaY);
        }
      }
      
      blocks[blockIdx] = block;
      this.portfolioState.blocks.set(blocks);
      this.portfolioState.markDirty();
    }
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    this.isDraggingBlock.set(false);
    this.isResizingBlock.set(false);
    this.activeResizeHandle.set(null);
  }
  ```

---

## 4. Builder Template (HTML)

### [MODIFY] [session.component.html](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/session/session.component.html)
- **Top Header Structure**:
  - Remove L1170 `"Diseño"` label buttons.
  - Scale height class to `h-14` or `h-12`.
  - Add 4th Preview Option:
    ```html
    <button (click)="portfolioState.setResponsiveMode('mobile-landscape')"
            [class.bg-brand-sage]="portfolioState.responsiveMode() === 'mobile-landscape'"
            class="p-2 rounded hover:bg-brand-charcoal/10 transition-colors">
      <lucide-icon name="smartphone" class="rotate-90 w-4 h-4"></lucide-icon>
    </button>
    ```
  - Bind publish button:
    ```html
    <button [disabled]="isSaved()"
            (click)="publishPortfolio()"
            class="px-4 py-1.5 bg-brand-sage text-white rounded font-serif text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
      Publicar
    </button>
    ```

- **Collapsible Sidebar**:
  - Add toggle triggers and layout updates:
    ```html
    <div [class]="sidebarCollapsed() ? 'w-16' : 'w-72'" class="relative border-r border-brand-charcoal/10 bg-brand-papel flex flex-col transition-all duration-300">
      <!-- Toggle button -->
      <button (click)="sidebarCollapsed.set(!sidebarCollapsed())" class="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-white border border-brand-charcoal/10 shadow flex items-center justify-center cursor-pointer hover:bg-brand-papel">
        <lucide-icon [name]="sidebarCollapsed() ? 'chevron-right' : 'chevron-left'" class="w-3 h-3 text-brand-charcoal"></lucide-icon>
      </button>

      <!-- Sidebar contents -->
      <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <!-- Minified state views -->
        <ng-container *ngIf="!sidebarCollapsed(); else collapsedIcons">
          <!-- Text headers / normal controls -->
        </ng-container>
        <ng-template #collapsedIcons>
          <div class="flex flex-col items-center gap-6 py-4">
            <div class="flex flex-col gap-4">
              <!-- Outline Lucide Icons centered -->
            </div>
          </div>
        </ng-template>
      </div>
    </div>
    ```

- **Responsive Viewport Wrapper**:
  - Wrap the builder preview canvas within constraints matching `'mobile-landscape'`:
    ```html
    <div [class.w-\[812px\]]="portfolioState.responsiveMode() === 'mobile-landscape'"
         [class.h-\[375px\]]="portfolioState.responsiveMode() === 'mobile-landscape'"
         [class.max-h-full]="portfolioState.responsiveMode() === 'mobile-landscape'">
    ```

- **Word-Style floating text format toolbar**:
  - Render dynamically above the selected elements on canvas clicks:
    ```html
    <div *ngIf="selectedBlockId() === block.id && block.type === 'text'"
         class="absolute z-50 -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-brand-charcoal text-brand-papel px-2.5 py-1.5 rounded-lg shadow-2xl border border-white/10 select-none">
      
      <!-- Font Family -->
      <select [value]="block.fontFamily || 'sans'" 
              (change)="updateTextBlockProp(block, 'fontFamily', $any($event.target).value)"
              class="bg-transparent border border-white/20 text-xs px-1.5 py-0.5 rounded text-white focus:outline-none">
        <option value="sans" class="text-black">Sans</option>
        <option value="serif" class="text-black">Serif</option>
        <option value="mono" class="text-black">Mono</option>
      </select>

      <span class="w-px h-4 bg-white/20"></span>

      <!-- Bold toggle -->
      <button (click)="toggleTextBlockWeight(block)"
              [class.bg-white\/20]="block.fontWeight === 'bold'"
              class="p-1 hover:bg-white/10 rounded transition-colors text-white">
        <lucide-icon name="bold" class="w-3.5 h-3.5"></lucide-icon>
      </button>

      <!-- Italic toggle -->
      <button (click)="toggleTextBlockStyle(block)"
              [class.bg-white\/20]="block.fontStyle === 'italic'"
              class="p-1 hover:bg-white/10 rounded transition-colors text-white">
        <lucide-icon name="italic" class="w-3.5 h-3.5"></lucide-icon>
      </button>

      <span class="w-px h-4 bg-white/20"></span>

      <!-- Align options -->
      <button (click)="updateTextBlockProp(block, 'textAlign', 'left')"
              [class.bg-white\/20]="block.textAlign === 'left'"
              class="p-1 hover:bg-white/10 rounded text-white">
        <lucide-icon name="align-left" class="w-3.5 h-3.5"></lucide-icon>
      </button>
      <button (click)="updateTextBlockProp(block, 'textAlign', 'center')"
              [class.bg-white\/20]="block.textAlign === 'center'"
              class="p-1 hover:bg-white/10 rounded text-white">
        <lucide-icon name="align-center" class="w-3.5 h-3.5"></lucide-icon>
      </button>
      <button (click)="updateTextBlockProp(block, 'textAlign', 'right')"
              [class.bg-white\/20]="block.textAlign === 'right'"
              class="p-1 hover:bg-white/10 rounded text-white">
        <lucide-icon name="align-right" class="w-3.5 h-3.5"></lucide-icon>
      </button>
      <button (click)="updateTextBlockProp(block, 'textAlign', 'justify')"
              [class.bg-white\/20]="block.textAlign === 'justify'"
              class="p-1 hover:bg-white/10 rounded text-white">
        <lucide-icon name="align-justify" class="w-3.5 h-3.5"></lucide-icon>
      </button>

      <span class="w-px h-4 bg-white/20"></span>

      <!-- Text Color Input -->
      <input type="color" 
             [value]="block.textColor || '#1a1a1a'" 
             (input)="updateTextBlockProp(block, 'textColor', $any($event.target).value)"
             class="w-5 h-5 border-0 rounded cursor-pointer bg-transparent">
    </div>
    ```

---

## 5. Public Parity Views

Ensure visual parity by updating the templates of public rendering pages to use sticky headers, fixed social footers, and crisp slide layering.

### [MODIFY] [anuncios.component.html](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/anuncios/anuncios.component.html)
### [MODIFY] [buscar.html](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/buscar/buscar.html)
### [MODIFY] [inicio.component.html](file:///c:/Users/Rubén/Documents/Projets GBN/prueba/frontend-public/src/app/pages/inicio/inicio.component.html)
- **Header Element**: Apply Tailwind transitions and bind `isScrolled()` logic:
  ```html
  <header [class.h-12]="isScrolled()"
          [class.h-20]="!isScrolled()"
          [class.py-2]="isScrolled()"
          [class.py-4]="!isScrolled()"
          [class.bg-brand-papel\/95]="isScrolled()"
          [class.backdrop-blur]="isScrolled()"
          [class.shadow-sm]="isScrolled()"
          class="sticky top-0 z-40 w-full flex items-center justify-between transition-all duration-300 ease-in-out px-6 border-b border-transparent"
          style="border-color: var(--landing-border);">
  ```
- **Slider Layout layering (z-index fixes)**:
  ```html
  <div class="relative w-full h-[400px] overflow-hidden rounded-xl">
    <!-- z-0 base background and overlays -->
    <img [src]="slide.url" class="absolute inset-0 w-full h-full object-cover z-0">
    <div class="absolute inset-0 bg-black/40 z-0"></div>

    <!-- z-10 inner content cards (crisp and readable) -->
    <div class="relative z-10 w-full h-full flex flex-col justify-end p-6 text-white">
      <h3 class="text-xl font-bold font-serif">{{ slide.text }}</h3>
    </div>
  </div>
  ```
- **Fixed Footer Alignment**:
  Ensure the footer containing social media icons is styled statically as fixed inside the modal viewport:
  ```html
  <footer class="fixed bottom-0 left-0 right-0 z-30 border-t bg-brand-papel py-3 px-6 flex items-center justify-between shadow-md"
          style="background-color: var(--landing-bg); border-color: var(--landing-border);">
  ```
