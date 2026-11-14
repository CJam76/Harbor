# Harbor — A Calm, Local-First Personal Workspace

Harbor is a local-first personal workspace engineered for students, researchers, and builders managing deep projects and coursework. It synthesizes the structured data engine of Notion with the plain-text sovereignty, speed, and bidirectional linking of Obsidian.

Harbor is styled in **Graphic Realism**: 0–3px near-square corners, crisp hairline borders, deep navy surfaces, tactile paper elevations, and pure black accents.

---

## 1. Key Capabilities

### 1. Landing Page
- **Curated Rotating Platitudes:** 55 original, calm, non-cheesy academic and reflective aphorisms that rotate on a timer with a gentle 400ms crossfade without repeating consecutively.
- **Getting Started Guide:** Interactive 4-step onboarding checklist that automatically collapses once the workspace accumulates content.
- **Aggregated Metrics & Widgets:** Quick access to recently modified pages, spaces overview, and an automatically aggregated **Tasks & Deliverables Due Soon** feed populated from all databases with date columns.

### 2. Spaces & Unlimited Nested Page Tree
- **Top-level Spaces:** "Spring Semester", "Capstone", "Personal", or custom vaults.
- **Drag-and-Drop Tree:** Re-nest pages to arbitrary depth or reorder within spaces using native drag events with visual drop indicators (`inside`, `before`, `after`).
- **Context Operations:** Kebab and right-click menus for instant rename, add sub-page, duplicate, and delete.
- **Mobile Responsive Drawer:** Collapsible sidebar with touch-friendly targets and backdrop overlay.

### 3. Dual-Mode Markdown & Rich Writing
- **Rich / Live Formatting Mode:** Instant rendering of formatted blocks, interactive task checkboxes (`- [ ]` / `- [x]`), custom callouts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`), syntax-highlighted code blocks, and markdown tables.
- **LaTeX Math Formulas (KaTeX):** Full support for inline math `$c_{\text{crit}} = \log_b(a)$` and display block equations `$$T(n) = a \cdot T(n/b) + f(n)$$` with slash command `/math`.
- **Mermaid Diagrams:** Live rendering of architecture flowcharts, sequence diagrams, and mindmaps using ` ```mermaid ` with slash command `/mermaid`.
- **Slash Commands (`/`):** Trigger quick insertion of Headings (H1/H2/H3), Lists, Task items, Callout boxes, Tables, Code snippets, LaTeX Formulas, Mermaid Diagrams, Dividers, and Wiki links.
- **Floating Toolbar:** Highlight text to summon formatting tools (bold, italic, strikethrough, inline code, wiki link).
- **Bidirectional `[[Wiki Links]]`:** Autocomplete popup triggered on typing `[[`. Automatically indexes backlinks from other pages across the workspace.
- **Outline & Reading Statistics:** Live Table of Contents generated from markdown headings with click-to-jump, live word count, and estimated reading time.
- **Note Connections Panel:** Inspect outgoing wiki links and incoming backlinks for the active page, with a 1-click jump to the visual Knowledge Graph.
- **Raw Markdown Mode:** Full distraction-free code/markdown editor with lossless mode switching.

### 4. Interactive Knowledge Graph
- **2D Canvas Physics Engine:** Real-time force-directed simulation with electrostatic repulsion, Hooke spring attraction along wiki-links and page hierarchies, and velocity damping.
- **Space Color-Coding & Dynamic Sizing:** Node radius scales with connectivity degree and reflects Space color themes.
- **Controls & Navigation:**
  - Pan and scroll-wheel zoom with smooth transforms.
  - Drag nodes to manually arrange conceptual clusters.
  - Hover highlights node, connected neighbors, and incident edges with an interactive tooltip.
  - Click any node to navigate directly to that document or open its database record.
  - Filter by Space, search nodes by name, toggle orphan notes, and pause/run physics.

### 5. Structured Databases & Views
- **Typed Columns:** Text, Number, Select, Multi-Select, Status, Date, Checkbox, URL, and Relation.
- **Multiple Views:**
  - **Table View:** Crisp grid with inline cell editing for all types, customizable column widths, column creation, and **Column Calculation Footers** (`Sum`, `Average`, `Min`, `Max`, `Checked/Unchecked`, `Count`).
  - **Gallery View:** Visual card grid with preview covers, property pills, card size adjustments (Small, Medium, Large), and 1-click creation.
  - **Board (Kanban) View:** Dynamic cards grouped by status or select options with drag-and-drop between columns.
  - **List View:** Document-style minimalist row view with due dates and completion toggles.
  - **Calendar View:** Monthly visual grid plotting rows by date column with day-click creation.
- **Saved Views & Querying:** Live filter bar, multi-column sorting (ascending/descending), and column show/hide controls.
- **Rows as Pages:** Every database row opens as a full page with a structured property editor at the top and an open-ended Markdown document editor below.
- **Starter Templates:** Preloaded with *Tasks & Sprints*, *Assignments & Deadlines*, *Reading List*, and *Project Tracker*.

### 6. Desktop Power Workflows & Immersion
- **Daily Notes & Global Quick-Capture:** 1-click **"Today's Daily Note"** (<kbd>Ctrl+Alt+D</kbd>) with day breadcrumbs and auto-aggregated due tasks, plus a system-wide floating **Quick-Capture Scratchpad** (<kbd>Ctrl+Alt+N</kbd>).
- **Multi-Tab & Split-Screen View:** Browser/editor tab bar with quick navigation, tab closing (<kbd>Ctrl+W</kbd>), new note (<kbd>Ctrl+T</kbd>), and side-by-side dual pane split view (<kbd>Ctrl+\</kbd>) for simultaneous dual editing and cross-referencing.
- **Zen Focus Writing Mode:** Distraction-free immersion (<kbd>F11</kbd> / <kbd>Ctrl+Shift+F</kbd>) with floating ambient Pomodoro focus timer, word count analytics, optical **Typewriter Scrolling Mode** (<kbd>Ctrl+Shift+T</kbd>), and active paragraph focus dimming.
- **Media Drag-and-Drop & Notion Blocks:** Desktop drag-and-drop and clipboard paste (<kbd>Ctrl+V</kbd>) for inline images, interactive collapsible accordion toggles (`/toggle`), and rich web bookmark cards (`/bookmark`).

### 7. Local-First Storage, Obsidian Mirror & Portability
- **Browser-Native Persistence:** Powered by IndexedDB via Dexie with automatic memory caching and debounced disk persistence.
- **Local Obsidian Vault Mirror:** Direct disk synchronization via the browser's File System Access API (`window.showDirectoryPicker`). Sync any Space to a local folder on your computer as standard `.md` files with YAML frontmatter, or import an existing Obsidian vault into Harbor.
- **Abstract Storage Interface (`IStorageAdapter`):** Decouples the React UI from the storage layer, allowing future synchronization (e.g. CRDTs, SQLite, CouchDB, or REST backends) without changing any UI component.
- **Portability:**
  - Full workspace backup and restore via versioned `.json`.
  - Export individual pages as standard `.md` markdown files.
  - Export database tables as `.csv` spreadsheets.
  - Import external `.md` markdown files into any space.

### 7. Instant Global Search (`Cmd/Ctrl + K`)
- High-speed index searching page titles, database names, tags, and document content.
- Keyboard navigation (arrows to highlight, Enter to jump, Escape to close) with contextual snippet highlights.

---

## 2. Design System: Graphic Realism

Harbor's aesthetic rejects bubbly, toy-like interfaces in favor of calm, corporate-grade precision:
- **Geometry:** 0–3px border radii (`rounded-none` or `rounded-sm`), crisp hairline borders (`1px solid rgba(15, 23, 42, 0.08)` / dark: `rgba(255, 255, 255, 0.08)`).
- **Elevations:**
  - *Paper:* Slightly warm, layered surface with subtle diffuse shadow and generous reading margins.
  - *Glass:* Translucent sidebar, headers, and popover menus with `backdrop-filter: blur(12px)`.
- **Palette:**
  - Light: Cool pale blue-white canvas (`#f4f7fa`), crisp paper (`#ffffff`), deep slate text (`#0a0d14`), and true black accents (`#080c14`).
  - Dark: Deep navy and black glass (`#070b14`, `#0b111e`, `#101a2e`).
  - Focus Accent: High-contrast azure blue (`#0284c7`, `#38bdf8`).
- **Typography:**
  - Interface: Sharp modern sans (*Inter* / system-ui).
  - Editorial: User-switchable refined serif (*Newsreader* / *Charter* / Georgia).
  - Code: Monospace (*JetBrains Mono* / Consolas).
- **Tactility:** Tactile pressed state on buttons (`transform: translateY(1px)`). Full compliance with `prefers-reduced-motion`.

---

## 3. Data Schema & Migration Architecture

The storage layer is encapsulated behind `IStorageAdapter`:

```typescript
export interface Space {
  id: string;
  name: string;
  icon?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Page {
  id: string;
  spaceId: string;
  parentId?: string | null;   // Unlimited hierarchical nesting
  title: string;
  icon?: string;
  content: string;            // Standard Markdown
  isDatabaseRow?: boolean;    // Unified row-as-page architecture
  databaseId?: string;
  properties?: Record<string, any>; // Mapped by columnId
  tags?: string[];
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Database {
  id: string;
  spaceId: string;
  title: string;
  description?: string;
  columns: DatabaseColumn[];
  views: DatabaseView[];
  defaultViewId: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceBackup {
  version: number;            // Schema versioning for future migrations
  exportedAt: string;
  spaces: Space[];
  pages: Page[];
  databases: Database[];
}
```

---

## 4. How to Run Harbor

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or pnpm
- Windows 10/11 (or macOS / Linux)

### Web Application Mode
```bash
# Navigate to the project
cd harbor

# Install dependencies (if not already installed)
npm install

# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Running as a Native Desktop App (Electron)

Harbor includes a dedicated Electron desktop runtime that runs as an independent Windows desktop application with full native filesystem permissions, hardware acceleration, and seamless Obsidian vault integration without web security prompts.

### Desktop Development Mode
Run the live React dev server with Hot Module Replacement connected to the Electron desktop shell:
```bash
npm run electron:dev
```

### Packaging & Standalone Windows Executable
You can package Harbor into an unpacked Windows application directory or a single portable `.exe`:

```bash
# Compile and package unpacked Windows application (in release/win-unpacked/)
npm run dist:dir

# Compile and package portable single-file executable (in release/Harbor-1.0.0.exe)
npm run dist:portable

# Or generate full NSIS Windows installer
npm run dist
```

### Launching the Packaged Desktop App
Once packaged, run Harbor directly from File Explorer or terminal:
```powershell
.\release\win-unpacked\Harbor.exe
```
You can also right-click `Harbor.exe` and select **Pin to taskbar** or **Pin to Start** for instant access anytime.
