import { Database, Page, Space, Canvas } from '../../types';

export const INITIAL_SPACES: Space[] = [
  {
    id: 'space-spring-semester',
    name: 'Spring Semester',
    icon: 'GraduationCap',
    order: 0,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  },
  {
    id: 'space-capstone',
    name: 'Capstone',
    icon: 'Cpu',
    order: 1,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'space-personal',
    name: 'Personal',
    icon: 'Compass',
    order: 2,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  }
];

export const INITIAL_DATABASES: Database[] = [
  {
    id: 'db-assignments',
    spaceId: 'space-spring-semester',
    title: 'Assignments & Deadlines',
    description: 'Course deliverables, problem sets, and milestones.',
    icon: 'CheckSquare',
    columns: [
      { id: 'col-title', name: 'Deliverable', type: 'text', width: 260 },
      {
        id: 'col-course',
        name: 'Course',
        type: 'select',
        width: 140,
        options: [
          { id: 'opt-cs340', label: 'CS 340 Algorithms', color: 'blue' },
          { id: 'opt-econ101', label: 'ECON 101 Micro', color: 'emerald' },
          { id: 'opt-art202', label: 'ART 202 Studio', color: 'purple' },
          { id: 'opt-phil210', label: 'PHIL 210 Logic', color: 'amber' },
        ]
      },
      { id: 'col-due', name: 'Due Date', type: 'date', width: 140 },
      {
        id: 'col-status',
        name: 'Status',
        type: 'status',
        width: 150,
        options: [
          { id: 'status-not-started', label: 'Not Started', color: 'slate' },
          { id: 'status-in-progress', label: 'In Progress', color: 'blue' },
          { id: 'status-submitted', label: 'Submitted', color: 'indigo' },
          { id: 'status-graded', label: 'Graded', color: 'emerald' },
        ]
      },
      { id: 'col-weight', name: 'Weight %', type: 'number', width: 100 },
      { id: 'col-grade', name: 'Grade', type: 'text', width: 100 },
    ],
    views: [
      {
        id: 'view-assign-table',
        name: 'All Deliverables',
        type: 'table',
        visibleColumnIds: ['col-title', 'col-course', 'col-due', 'col-status', 'col-weight', 'col-grade'],
        sort: [{ columnId: 'col-due', direction: 'asc' }]
      },
      {
        id: 'view-assign-board',
        name: 'By Status',
        type: 'board',
        groupByColumnId: 'col-status',
        visibleColumnIds: ['col-title', 'col-course', 'col-due', 'col-status', 'col-weight']
      },
      {
        id: 'view-assign-list',
        name: 'Due Soon',
        type: 'list',
        visibleColumnIds: ['col-title', 'col-course', 'col-due', 'col-status']
      },
      {
        id: 'view-assign-cal',
        name: 'Calendar',
        type: 'calendar',
        visibleColumnIds: ['col-title', 'col-course', 'col-due', 'col-status']
      }
    ],
    defaultViewId: 'view-assign-table',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'db-reading-list',
    spaceId: 'space-spring-semester',
    title: 'Reading List',
    description: 'Textbooks, research papers, and monographs for academic reference.',
    icon: 'BookOpen',
    columns: [
      { id: 'col-book-title', name: 'Title', type: 'text', width: 260 },
      { id: 'col-author', name: 'Author', type: 'text', width: 160 },
      {
        id: 'col-status',
        name: 'Status',
        type: 'status',
        width: 140,
        options: [
          { id: 'r-want', label: 'To Read', color: 'slate' },
          { id: 'r-reading', label: 'Reading', color: 'blue' },
          { id: 'r-done', label: 'Finished', color: 'emerald' },
        ]
      },
      {
        id: 'col-format',
        name: 'Format',
        type: 'select',
        width: 120,
        options: [
          { id: 'fmt-hardcover', label: 'Print', color: 'amber' },
          { id: 'fmt-pdf', label: 'PDF / Paper', color: 'purple' },
          { id: 'fmt-ebook', label: 'ePub', color: 'cyan' },
        ]
      },
      { id: 'col-rating', name: 'Rating', type: 'number', width: 100 },
      { id: 'col-notes-link', name: 'Source URL', type: 'url', width: 200 }
    ],
    views: [
      {
        id: 'view-reading-table',
        name: 'Library',
        type: 'table',
        visibleColumnIds: ['col-book-title', 'col-author', 'col-status', 'col-format', 'col-rating', 'col-notes-link']
      },
      {
        id: 'view-reading-board',
        name: 'Reading Pipeline',
        type: 'board',
        groupByColumnId: 'col-status',
        visibleColumnIds: ['col-book-title', 'col-author', 'col-format', 'col-rating']
      }
    ],
    defaultViewId: 'view-reading-table',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
  },
  {
    id: 'db-sprint-tasks',
    spaceId: 'space-capstone',
    title: 'Sprint Tasks',
    description: 'Engineering and design tasks for capstone prototype.',
    icon: 'Layers',
    columns: [
      { id: 'col-task', name: 'Task', type: 'text', width: 280 },
      {
        id: 'col-status',
        name: 'Status',
        type: 'status',
        width: 140,
        options: [
          { id: 'task-backlog', label: 'Backlog', color: 'slate' },
          { id: 'task-ready', label: 'Ready', color: 'cyan' },
          { id: 'task-in-prog', label: 'In Progress', color: 'blue' },
          { id: 'task-review', label: 'Review', color: 'amber' },
          { id: 'task-done', label: 'Done', color: 'emerald' },
        ]
      },
      {
        id: 'col-priority',
        name: 'Priority',
        type: 'select',
        width: 120,
        options: [
          { id: 'prio-urgent', label: 'Urgent', color: 'rose' },
          { id: 'prio-high', label: 'High', color: 'amber' },
          { id: 'prio-med', label: 'Medium', color: 'blue' },
          { id: 'prio-low', label: 'Low', color: 'slate' },
        ]
      },
      { id: 'col-due', name: 'Target Date', type: 'date', width: 140 },
      { id: 'col-done-check', name: 'Verified', type: 'checkbox', width: 100 }
    ],
    views: [
      {
        id: 'view-sprint-board',
        name: 'Kanban Board',
        type: 'board',
        groupByColumnId: 'col-status',
        visibleColumnIds: ['col-task', 'col-priority', 'col-due', 'col-done-check']
      },
      {
        id: 'view-sprint-table',
        name: 'Backlog Table',
        type: 'table',
        visibleColumnIds: ['col-task', 'col-status', 'col-priority', 'col-due', 'col-done-check']
      }
    ],
    defaultViewId: 'view-sprint-board',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    id: 'db-projects',
    spaceId: 'space-personal',
    title: 'Project Tracker',
    description: 'Personal side quests, creative projects, and skill milestones.',
    icon: 'FolderGit2',
    columns: [
      { id: 'col-project', name: 'Project Name', type: 'text', width: 240 },
      {
        id: 'col-phase',
        name: 'Phase',
        type: 'select',
        width: 140,
        options: [
          { id: 'ph-idea', label: 'Ideation', color: 'purple' },
          { id: 'ph-plan', label: 'Planning', color: 'cyan' },
          { id: 'ph-build', label: 'Building', color: 'blue' },
          { id: 'ph-shipped', label: 'Shipped', color: 'emerald' },
        ]
      },
      {
        id: 'col-health',
        name: 'Health',
        type: 'status',
        width: 130,
        options: [
          { id: 'h-green', label: 'On Track', color: 'emerald' },
          { id: 'h-amber', label: 'At Risk', color: 'amber' },
          { id: 'h-red', label: 'Blocked', color: 'rose' },
        ]
      },
      { id: 'col-target', name: 'Target Launch', type: 'date', width: 140 },
      { id: 'col-repo', name: 'Repository / Link', type: 'url', width: 220 }
    ],
    views: [
      {
        id: 'view-proj-table',
        name: 'Overview',
        type: 'table',
        visibleColumnIds: ['col-project', 'col-phase', 'col-health', 'col-target', 'col-repo']
      },
      {
        id: 'view-proj-board',
        name: 'By Phase',
        type: 'board',
        groupByColumnId: 'col-phase',
        visibleColumnIds: ['col-project', 'col-health', 'col-target']
      }
    ],
    defaultViewId: 'view-proj-table',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  }
];

export const INITIAL_PAGES: Page[] = [
  // Standalone pages in Spring Semester
  {
    id: 'page-syllabus',
    spaceId: 'space-spring-semester',
    parentId: null,
    title: 'CS 340 Course Syllabus & Foundations',
    icon: 'FileText',
    order: 0,
    tags: ['algorithms', 'academics', 'spring2026'],
    content: `# CS 340: Advanced Algorithms & Data Structures

> [!NOTE]
> Lectures occur Tuesday and Thursday 10:00 AM - 11:30 AM in Turing Hall 302. Office hours on Wednesdays.

## Core Objectives
Welcome to CS 340. This course covers asymptotically efficient algorithms, amortized complexity, and graph optimization.

Check the assignments in [[Assignments & Deadlines]] to stay ahead of upcoming due dates. Also review [[Capstone Architecture Spec]] for cross-disciplinary insights into practical system design.

### Weekly Preparation Checklist
- [x] Read Chapter 1-3 of CLRS Introduction to Algorithms
- [x] Set up local benchmarking environment
- [ ] Implement union-find with path compression
- [ ] Submit Problem Set 1 (Graph Decomposition)

### Key Reference Equations (LaTeX)
When analyzing divide-and-conquer recurrences using the Master Theorem:
$$
T(n) = a \\cdot T\\left(\\frac{n}{b}\\right) + f(n)
$$

Where the critical recurrence exponent is $c_{\\text{crit}} = \\log_b(a)$.

| Case | Condition | Solution |
| :--- | :--- | :--- |
| Case 1 | $f(n) = O(n^{\\log_b(a) - \\epsilon})$ | $T(n) = \\Theta(n^{\\log_b(a)})$ |
| Case 2 | $f(n) = \\Theta(n^{\\log_b(a)})$ | $T(n) = \\Theta(n^{\\log_b(a)} \\lg n)$ |
| Case 3 | $f(n) = \\Omega(n^{\\log_b(a) + \\epsilon})$ | $T(n) = \\Theta(f(n))$ |

### Quick Code Snippet: Disjoint Set
\`\`\`typescript
class DisjointSet {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] === i) return i;
    return this.parent[i] = this.find(this.parent[i]);
  }
}
\`\`\`

> [!TIP]
> Keep your notes concise and link related problem sets using [[wiki links]] for fast navigation.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 13,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'page-graph-notes',
    spaceId: 'space-spring-semester',
    parentId: 'page-syllabus', // Nested sub-page!
    title: 'Graph Theory & Shortest Path Notes',
    icon: 'Network',
    order: 0,
    tags: ['graphs', 'notes'],
    content: `# Graph Theory & Shortest Path Notes

Sub-page nested cleanly under [[CS 340 Course Syllabus & Foundations]].

## Dijkstra vs Bellman-Ford
- **Dijkstra's Algorithm**: Requires non-negative edge weights. Runs in \`O((V + E) log V)\` with binary heaps.
- **Bellman-Ford**: Handles negative weights; detects negative weight cycles in \`O(V * E)\`.

### Implementation Tips
1. Always test with disconnected components.
2. In bidirectional search, balance the frontiers.
3. Compare against [[Assignments & Deadlines]] requirements.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },

  // Database rows for Assignments (each row is also a page with its own markdown body!)
  {
    id: 'row-assign-1',
    spaceId: 'space-spring-semester',
    databaseId: 'db-assignments',
    isDatabaseRow: true,
    title: 'Problem Set 1: Graph Traversal',
    order: 0,
    properties: {
      'col-title': 'Problem Set 1: Graph Traversal',
      'col-course': 'opt-cs340',
      'col-due': new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      'col-status': 'status-in-progress',
      'col-weight': 15,
      'col-grade': ''
    },
    content: `# Problem Set 1: Graph Traversal Implementation

This deliverable requires implementing BFS, DFS, and topological sort on large sparse graphs.

### Status & Tasks
- [x] Parse adjacency list inputs from standard format
- [x] Implement iterative BFS with queue
- [ ] Test cycle detection on directed acyclic graph (DAG)
- [ ] Write proof of correctness for theorem 2.4

Refer to [[CS 340 Course Syllabus & Foundations]] for course grading rubrics.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'row-assign-2',
    spaceId: 'space-spring-semester',
    databaseId: 'db-assignments',
    isDatabaseRow: true,
    title: 'Microeconomics Essay: Market Equilibrium',
    order: 1,
    properties: {
      'col-title': 'Microeconomics Essay: Market Equilibrium',
      'col-course': 'opt-econ101',
      'col-due': new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
      'col-status': 'status-not-started',
      'col-weight': 20,
      'col-grade': ''
    },
    content: `# Microeconomics Essay: Elasticity & Market Equilibrium

Analysis of price elasticity of demand under shifting consumer preferences.

### Required Outline
1. Introduction and thesis
2. Mathematical model of price elasticity
3. Case study: Energy markets 2024-2026
4. Policy recommendations and conclusion
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'row-assign-3',
    spaceId: 'space-spring-semester',
    databaseId: 'db-assignments',
    isDatabaseRow: true,
    title: 'Studio Project: Graphic Realism Critique',
    order: 2,
    properties: {
      'col-title': 'Studio Project: Graphic Realism Critique',
      'col-course': 'opt-art202',
      'col-due': new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
      'col-status': 'status-in-progress',
      'col-weight': 25,
      'col-grade': ''
    },
    content: `# Studio Project: Graphic Realism Critique

Focusing on digital typography, hairline borders, and tactical depth in corporate software design.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },

  // Database rows for Reading List
  {
    id: 'row-book-1',
    spaceId: 'space-spring-semester',
    databaseId: 'db-reading-list',
    isDatabaseRow: true,
    title: 'Designing Data-Intensive Applications',
    order: 0,
    properties: {
      'col-book-title': 'Designing Data-Intensive Applications',
      'col-author': 'Martin Kleppmann',
      'col-status': 'r-reading',
      'col-format': 'fmt-hardcover',
      'col-rating': 5,
      'col-notes-link': 'https://dataintensive.net'
    },
    content: `# Designing Data-Intensive Applications

Notes on Chapter 5: Replication (Single-leader, Multi-leader, Leaderless).
Key insight: Local-first software leverages leaderless or CRDT-based sync strategies for true offline capability.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },

  // Capstone Space pages
  {
    id: 'page-capstone-spec',
    spaceId: 'space-capstone',
    parentId: null,
    title: 'Capstone Architecture Spec',
    icon: 'Layers',
    order: 0,
    tags: ['capstone', 'architecture', 'design'],
    content: `# Capstone Architecture Specification

## Overview
Harbor is engineered as a local-first workspace. All user data resides in IndexedDB on the device, ensuring instantaneous load times, total privacy, and unhindered offline work.

See [[Sprint Tasks]] for our active development roadmap.

### Architecture Pillars
1. **Zero-Latency Storage**: Local IndexedDB queries execute synchronously against memory cache with asynchronous persistence.
2. **Lossless Portability**: Clean JSON backup export, markdown bundle export, and CSV database tables.
3. **Graphic Realism Aesthetic**: Sharp 0-3px corners, hairline borders, cool glass and tactile paper elevations.

### System Architecture Topology
\`\`\`mermaid
graph TD
  UI[Harbor UI Glass & Paper] --> State[WorkspaceContext State]
  State --> Adapter[IStorageAdapter Interface]
  Adapter --> IDB[(IndexedDB Dexie)]
  Adapter --> FS[Local Folder Obsidian Sync]
  State --> Graph[Interactive Knowledge Graph]
  State --> Engine[LaTeX Math & Mermaid Engine]
\`\`\`
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },

  // Sprint Tasks rows
  {
    id: 'row-task-1',
    spaceId: 'space-capstone',
    databaseId: 'db-sprint-tasks',
    isDatabaseRow: true,
    title: 'Implement drag-and-drop tree reordering',
    order: 0,
    properties: {
      'col-task': 'Implement drag-and-drop tree reordering',
      'col-status': 'task-done',
      'col-priority': 'prio-high',
      'col-due': new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString().split('T')[0],
      'col-done-check': true
    },
    content: `# Drag and Drop Tree Reordering

Allows users to re-nest pages to arbitrary depth and reorder spaces seamlessly.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'row-task-2',
    spaceId: 'space-capstone',
    databaseId: 'db-sprint-tasks',
    isDatabaseRow: true,
    title: 'Refine bidirectional [[wiki links]] and backlinks',
    order: 1,
    properties: {
      'col-task': 'Refine bidirectional [[wiki links]] and backlinks',
      'col-status': 'task-in-prog',
      'col-priority': 'prio-urgent',
      'col-due': new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0],
      'col-done-check': false
    },
    content: `# Bidirectional Wiki Links and Backlinks

Parse \`[[Page Title]]\` in markdown text and establish automatic backlink indices.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },

  // Personal Space
  {
    id: 'page-personal-habits',
    spaceId: 'space-personal',
    parentId: null,
    title: 'Weekly Review & Focus Principles',
    icon: 'Compass',
    order: 0,
    tags: ['reflection', 'habits', 'weekly'],
    content: `# Weekly Review & Focus Principles

> "Depth over volume. Deliberation over haste."

## End of Week Protocol
1. Reconcile all open tasks in [[Assignments & Deadlines]].
2. Review [[Sprint Tasks]] for Capstone blockers.
3. Clean out quick scratchpads into permanent notes.
4. Export weekly workspace JSON backup.
`,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  }
];

export const INITIAL_CANVASES: Canvas[] = [
  {
    id: 'canvas-capstone-architecture',
    spaceId: 'space-capstone',
    title: 'Capstone System Architecture & Canvas',
    description: 'Spatial whiteboard of core subsystems, pipelines, and data flow.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    isFavorite: true,
    data: {
      nodes: [
        {
          id: 'cnode-1',
          type: 'text',
          x: 80,
          y: 100,
          width: 280,
          height: 180,
          color: 'blue',
          title: 'Core Engine Subsystem',
          text: '### Local SQLite/IndexedDB Storage\n- Offline-first transactional persistence\n- Revisions & 30-day trash lifecycle\n- ZERO external cloud telemetry',
        },
        {
          id: 'cnode-2',
          type: 'file',
          x: 440,
          y: 80,
          width: 320,
          height: 220,
          color: 'emerald',
          title: 'Capstone Specification',
          fileId: 'page-capstone-spec',
          text: 'Embedded live reference to Capstone Project Overview note.',
        },
        {
          id: 'cnode-3',
          type: 'text',
          x: 80,
          y: 360,
          width: 280,
          height: 160,
          color: 'purple',
          title: 'Knowledge Graph Engine',
          text: '### Dynamic Force Simulation\n- Wiki-link bidirectional edge extraction\n- 1st & 2nd degree neighborhood traversal',
        },
        {
          id: 'cnode-4',
          type: 'text',
          x: 440,
          y: 360,
          width: 320,
          height: 160,
          color: 'amber',
          title: 'Notion Database Grid',
          text: '### Multi-View Engine\n- Kanban drag-and-drop\n- Table summary aggregates\n- CSV bidirectional export',
        },
      ],
      edges: [
        {
          id: 'cedge-1',
          fromNode: 'cnode-1',
          fromSide: 'right',
          toNode: 'cnode-2',
          toSide: 'left',
          label: 'powers',
          color: 'blue',
        },
        {
          id: 'cedge-2',
          fromNode: 'cnode-1',
          fromSide: 'bottom',
          toNode: 'cnode-3',
          toSide: 'top',
          label: 'indexes',
          color: 'purple',
        },
        {
          id: 'cedge-3',
          fromNode: 'cnode-2',
          fromSide: 'bottom',
          toNode: 'cnode-4',
          toSide: 'top',
          label: 'tracks deliverables',
          color: 'emerald',
        },
      ],
    },
  },
];

export async function seedInitialDataIfNeeded(storageInstance: any) {
  // Permanence check: if vault has ever been initialized or customized, never re-seed automatically
  const isInitialized = typeof window !== 'undefined' && localStorage.getItem('harbor_vault_initialized');
  if (isInitialized) {
    return false;
  }

  const existingSpaces = await storageInstance.getSpaces();
  if (existingSpaces.length === 0) {
    for (const space of INITIAL_SPACES) {
      await storageInstance.saveSpace(space);
    }
    for (const db of INITIAL_DATABASES) {
      await storageInstance.saveDatabase(db);
    }
    for (const page of INITIAL_PAGES) {
      await storageInstance.savePage(page);
    }
    for (const canvas of INITIAL_CANVASES) {
      await storageInstance.saveCanvas(canvas);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('harbor_vault_initialized', 'true');
    }
    return true;
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('harbor_vault_initialized', 'true');
  }

  // Also seed initial canvases if table is newly added
  if (storageInstance.getCanvases) {
    const existingCanvases = await storageInstance.getCanvases();
    if (existingCanvases.length === 0) {
      for (const canvas of INITIAL_CANVASES) {
        await storageInstance.saveCanvas(canvas);
      }
    }
  }

  return false;
}
