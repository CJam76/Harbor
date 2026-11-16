import React, { useState, useMemo, useRef } from 'react';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Layers
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { extractWikiLinks } from '../../lib/markdown';

interface LocalGraphMiniProps {
  pageId: string;
}

interface LocalNode {
  id: string;
  title: string;
  spaceName: string;
  isCenter: boolean;
  depth: 1 | 2;
  x: number;
  y: number;
}

interface LocalEdge {
  sourceId: string;
  targetId: string;
}

export const LocalGraphMini: React.FC<LocalGraphMiniProps> = ({ pageId }) => {
  const { pages, spaces, navigateToPage, navigateToGraph } = useWorkspace();

  const [depth, setDepth] = useState<1 | 2>(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const activePages = useMemo(() => pages.filter(p => !p.isDeleted), [pages]);

  const { nodes, edges, centerNode } = useMemo(() => {
    const currentPage = activePages.find(p => p.id === pageId);
    if (!currentPage) return { nodes: [], edges: [], centerNode: null };

    // Build title to ID map
    const titleToPage = new Map<string, typeof currentPage>();
    activePages.forEach(p => {
      titleToPage.set(p.title.toLowerCase().trim(), p);
    });

    // 1. Gather 1st degree neighbors
    const firstDegreeIds = new Set<string>();
    const edgesList: LocalEdge[] = [];

    // Outgoing from currentPage
    const outgoing = extractWikiLinks(currentPage.content);
    outgoing.forEach(title => {
      const target = titleToPage.get(title.toLowerCase().trim());
      if (target && target.id !== currentPage.id) {
        firstDegreeIds.add(target.id);
        edgesList.push({ sourceId: currentPage.id, targetId: target.id });
      }
    });

    // Incoming to currentPage
    activePages.forEach(p => {
      if (p.id === currentPage.id) return;
      const links = extractWikiLinks(p.content);
      if (links.some(l => l.toLowerCase().trim() === currentPage.title.toLowerCase().trim())) {
        firstDegreeIds.add(p.id);
        edgesList.push({ sourceId: p.id, targetId: currentPage.id });
      }
    });

    // 2. Gather 2nd degree neighbors if depth === 2
    const secondDegreeIds = new Set<string>();
    if (depth === 2) {
      firstDegreeIds.forEach(fId => {
        const fPage = activePages.find(p => p.id === fId);
        if (!fPage) return;

        // Outgoing from 1st-degree
        const out = extractWikiLinks(fPage.content);
        out.forEach(title => {
          const target = titleToPage.get(title.toLowerCase().trim());
          if (target && target.id !== currentPage.id && !firstDegreeIds.has(target.id)) {
            secondDegreeIds.add(target.id);
            edgesList.push({ sourceId: fId, targetId: target.id });
          }
        });

        // Incoming to 1st-degree
        activePages.forEach(p => {
          if (p.id === currentPage.id || firstDegreeIds.has(p.id) || secondDegreeIds.has(p.id)) return;
          const links = extractWikiLinks(p.content);
          if (links.some(l => l.toLowerCase().trim() === fPage.title.toLowerCase().trim())) {
            secondDegreeIds.add(p.id);
            edgesList.push({ sourceId: p.id, targetId: fId });
          }
        });
      });
    }

    // Position nodes radially around (150, 110)
    const centerX = 150;
    const centerY = 110;
    const nodesList: LocalNode[] = [];

    const centerSpace = spaces.find(s => s.id === currentPage.spaceId);
    const center: LocalNode = {
      id: currentPage.id,
      title: currentPage.title,
      spaceName: centerSpace?.name || 'Workspace',
      isCenter: true,
      depth: 1,
      x: centerX,
      y: centerY,
    };
    nodesList.push(center);

    // Position 1st degree nodes in inner ring
    const firstArr = Array.from(firstDegreeIds);
    firstArr.forEach((id, idx) => {
      const p = activePages.find(item => item.id === id);
      if (!p) return;
      const angle = (idx / Math.max(1, firstArr.length)) * 2 * Math.PI;
      const radius = 65;
      const space = spaces.find(s => s.id === p.spaceId);
      nodesList.push({
        id: p.id,
        title: p.title,
        spaceName: space?.name || 'Workspace',
        isCenter: false,
        depth: 1,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    // Position 2nd degree nodes in outer ring
    const secondArr = Array.from(secondDegreeIds);
    secondArr.forEach((id, idx) => {
      const p = activePages.find(item => item.id === id);
      if (!p) return;
      const angle = (idx / Math.max(1, secondArr.length)) * 2 * Math.PI + 0.3;
      const radius = 105;
      const space = spaces.find(s => s.id === p.spaceId);
      nodesList.push({
        id: p.id,
        title: p.title,
        spaceName: space?.name || 'Workspace',
        isCenter: false,
        depth: 2,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    return { nodes: nodesList, edges: edgesList, centerNode: center };
  }, [activePages, pageId, depth, spaces]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const nodeMap = useMemo(() => {
    const map = new Map<string, LocalNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-[#070b14]/60 overflow-hidden select-none">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-[10px] text-slate-500">
        <span className="font-mono uppercase font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
          <Share2 className="w-3 h-3 text-[#0284c7]" />
          Local Graph
        </span>

        <div className="flex items-center gap-1">
          {/* Depth 1 vs 2 toggle */}
          <button
            type="button"
            onClick={() => setDepth(d => (d === 1 ? 2 : 1))}
            className={`px-1.5 py-0.5 border text-[9px] font-mono transition-colors ${
              depth === 2
                ? 'border-[#0284c7] text-[#0284c7] bg-sky-50 dark:bg-sky-950/40 font-bold'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Toggle Connection Depth (1 vs 2 hops)"
          >
            {depth} Hop{depth === 2 ? 's' : ''}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          {/* Reset View */}
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>

          {/* Maximize to full graph */}
          <button
            type="button"
            onClick={navigateToGraph}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-[#0284c7] hover:text-[#0369a1]"
            title="Open Full Knowledge Graph (Ctrl+G)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        className="relative w-full h-52 cursor-grab active:cursor-grabbing overflow-hidden bg-slate-50/20 dark:bg-black/30"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {nodes.length <= 1 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400">
            <span>No connections yet.</span>
            <span className="text-[10px] text-slate-500 mt-1">Use [[Wiki Links]] in note body to link other pages.</span>
          </div>
        ) : (
          <svg className="w-full h-full">
            <defs>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const s = nodeMap.get(edge.sourceId);
                const t = nodeMap.get(edge.targetId);
                if (!s || !t) return null;
                const isHovered = hoveredNodeId === edge.sourceId || hoveredNodeId === edge.targetId;
                return (
                  <line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={isHovered ? '#0284c7' : '#94a3b8'}
                    strokeWidth={isHovered ? 1.5 : 1}
                    strokeOpacity={isHovered ? 0.9 : 0.4}
                    strokeDasharray={s.depth === 2 || t.depth === 2 ? '3 3' : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const isHovered = hoveredNodeId === n.id;
                const isCenter = n.isCenter;
                const isSecondDegree = n.depth === 2;

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNodeId(n.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={e => {
                      e.stopPropagation();
                      navigateToPage(n.id);
                    }}
                  >
                    {/* Center node pulse ring */}
                    {isCenter && (
                      <circle
                        r={16}
                        fill="url(#centerGlow)"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      r={isCenter ? 8 : isSecondDegree ? 4 : 5.5}
                      fill={
                        isCenter
                          ? '#0284c7'
                          : isHovered
                          ? '#38bdf8'
                          : isSecondDegree
                          ? '#64748b'
                          : '#10b981'
                      }
                      stroke={isCenter ? '#ffffff' : '#0b1120'}
                      strokeWidth={1.5}
                      className="transition-transform duration-100"
                    />

                    {/* Node label */}
                    <text
                      y={isCenter ? 16 : isSecondDegree ? 12 : 14}
                      textAnchor="middle"
                      className={`text-[9px] font-sans select-none pointer-events-none transition-colors ${
                        isCenter
                          ? 'font-bold fill-[#0284c7] dark:fill-[#38bdf8]'
                          : isHovered
                          ? 'font-semibold fill-slate-900 dark:fill-white'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {n.title.length > 14 ? `${n.title.substring(0, 12)}…` : n.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Hovered node floating badge */}
        {hoveredNodeId && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-200 shadow-sm pointer-events-none">
            <span className="font-semibold text-slate-900 dark:text-white">
              {nodeMap.get(hoveredNodeId)?.title}
            </span>
            <span className="text-slate-400 ml-1.5">
              ({nodeMap.get(hoveredNodeId)?.spaceName})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
