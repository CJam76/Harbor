import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Filter,
  Play,
  Pause,
  RotateCcw,
  Compass,
  FileText,
  Database as DbIcon,
  X,
  ExternalLink
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page, Space } from '../../types';
import { extractWikiLinks } from '../../lib/markdown';

interface GraphNode {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  spaceColor: string;
  isDatabaseRow?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
}

interface GraphEdge {
  sourceId: string;
  targetId: string;
  isHierarchy?: boolean;
}

const SPACE_COLORS = [
  '#0284c7', // Sky blue
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

export const GraphView: React.FC<{ filterPageId?: string }> = ({ filterPageId }) => {
  const {
    spaces,
    pages,
    databases,
    navigateToPage,
    openRowModal,
    theme,
  } = useWorkspace();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Controls & Filters
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOrphans, setShowOrphans] = useState<boolean>(true);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Transform (Pan & Zoom)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Map space colors
  const spaceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    spaces.forEach((s, idx) => {
      map.set(s.id, SPACE_COLORS[idx % SPACE_COLORS.length]);
    });
    return map;
  }, [spaces]);

  // Construct nodes and edges from pages and wiki links
  const { nodes, edges, nodeMap } = useMemo(() => {
    const activePages = pages.filter(p => {
      if (p.isDeleted) return false;
      if (selectedSpaceId !== 'all' && p.spaceId !== selectedSpaceId) return false;
      return true;
    });

    const pageTitleToId = new Map<string, string>();
    activePages.forEach(p => {
      pageTitleToId.set(p.title.toLowerCase().trim(), p.id);
    });

    // Also map database titles
    databases.filter(d => !d.isDeleted).forEach(d => {
      pageTitleToId.set(d.title.toLowerCase().trim(), d.id);
    });

    const edgesList: GraphEdge[] = [];
    const degreeMap = new Map<string, number>();

    // 1. Build edges from wiki links [[...]]
    activePages.forEach(p => {
      const wikiLinks = extractWikiLinks(p.content);
      wikiLinks.forEach(linkText => {
        const targetId = pageTitleToId.get(linkText.toLowerCase().trim());
        if (targetId && targetId !== p.id) {
          edgesList.push({ sourceId: p.id, targetId, isHierarchy: false });
          degreeMap.set(p.id, (degreeMap.get(p.id) || 0) + 1);
          degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
        }
      });

      // 2. Build edges from parent-child page nesting
      if (p.parentId && pageTitleToId.has(p.parentId)) {
        edgesList.push({ sourceId: p.parentId, targetId: p.id, isHierarchy: true });
        degreeMap.set(p.id, (degreeMap.get(p.id) || 0) + 1);
        degreeMap.set(p.parentId, (degreeMap.get(p.parentId) || 0) + 1);
      }
    });

    // Filter nodes if orphan toggle is off
    const nodesList: GraphNode[] = [];
    const map = new Map<string, GraphNode>();

    const width = 800;
    const height = 600;

    activePages.forEach((p, idx) => {
      const degree = degreeMap.get(p.id) || 0;
      if (!showOrphans && degree === 0) return;

      const space = spaces.find(s => s.id === p.spaceId);
      const angle = (idx / activePages.length) * 2 * Math.PI;
      const radiusDist = 150 + Math.random() * 150;

      const node: GraphNode = {
        id: p.id,
        title: p.title,
        spaceId: p.spaceId,
        spaceName: space?.name || 'Workspace',
        spaceColor: spaceColorMap.get(p.spaceId) || '#0284c7',
        isDatabaseRow: p.isDatabaseRow,
        x: Math.cos(angle) * radiusDist,
        y: Math.sin(angle) * radiusDist,
        vx: 0,
        vy: 0,
        radius: Math.min(14, Math.max(5, 5 + degree * 1.5)),
        degree,
      };

      nodesList.push(node);
      map.set(p.id, node);
    });

    return { nodes: nodesList, edges: edgesList, nodeMap: map };
  }, [pages, spaces, databases, selectedSpaceId, showOrphans, spaceColorMap]);

  // Keep animated simulation reference
  const nodesRef = useRef<GraphNode[]>([]);
  nodesRef.current = nodes;

  // Center view on mount
  useEffect(() => {
    if (canvasRef.current) {
      transformRef.current = {
        x: canvasRef.current.clientWidth / 2,
        y: canvasRef.current.clientHeight / 2,
        scale: 1,
      };
    }
  }, []);

  // Physics and Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Handle canvas resize
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Physics Step
      if (isPhysicsRunning) {
        const currentNodes = nodesRef.current;
        const repulseForce = 1200;
        const springLength = 80;
        const springStrength = 0.04;
        const centerGravity = 0.005;
        const damping = 0.88;

        // 1. Node Repulsion
        for (let i = 0; i < currentNodes.length; i++) {
          const n1 = currentNodes[i];
          for (let j = i + 1; j < currentNodes.length; j++) {
            const n2 = currentNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 400) {
              const force = repulseForce / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        // 2. Edge Attraction (Springs)
        for (const edge of edges) {
          const source = nodeMap.get(edge.sourceId);
          const target = nodeMap.get(edge.targetId);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - springLength) * springStrength;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        }

        // 3. Center Gravity & Damping
        for (const node of currentNodes) {
          if (draggedNodeRef.current?.id === node.id) continue;
          node.vx -= node.x * centerGravity;
          node.vy -= node.y * centerGravity;
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;
        }
      }

      // Drawing
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';
      const bgColor = isDark ? '#070b14' : '#f4f7fa';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.scale, transformRef.current.scale);

      // Connected neighbors set for hover highlight
      const highlightedIds = new Set<string>();
      if (hoveredNode) {
        highlightedIds.add(hoveredNode.id);
        edges.forEach(e => {
          if (e.sourceId === hoveredNode.id) highlightedIds.add(e.targetId);
          if (e.targetId === hoveredNode.id) highlightedIds.add(e.sourceId);
        });
      }

      // 1. Draw Edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);
        if (!source || !target) continue;

        const isHighlighted =
          hoveredNode &&
          (source.id === hoveredNode.id || target.id === hoveredNode.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (edge.isHierarchy) {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([]);
        }

        if (hoveredNode) {
          if (isHighlighted) {
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.8;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
            ctx.lineWidth = 0.8;
          }
        } else {
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';
          ctx.lineWidth = 1.0;
        }

        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Draw Nodes
      const queryLower = searchQuery.toLowerCase().trim();

      for (const node of nodesRef.current) {
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = highlightedIds.has(node.id);
        const isMatch = queryLower && node.title.toLowerCase().includes(queryLower);

        let opacity = 1;
        if (hoveredNode && !isHovered && !isConnected) {
          opacity = 0.2;
        }

        ctx.globalAlpha = opacity;

        // Outer glow on hover or search match
        if (isHovered || isMatch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isMatch ? 'rgba(245, 158, 11, 0.3)' : 'rgba(2, 132, 199, 0.3)';
          ctx.fill();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isMatch ? '#f59e0b' : node.spaceColor;
        ctx.fill();

        // Border ring
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isDark ? '#070b14' : '#ffffff';
        ctx.stroke();

        // Label (show on hover, large nodes, or match)
        if (isHovered || isMatch || node.degree >= 2 || transformRef.current.scale > 1.2) {
          ctx.font = `${isHovered ? 'bold ' : ''}11px Inter, sans-serif`;
          ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          ctx.textAlign = 'center';
          ctx.fillText(node.title, node.x, node.y + node.radius + 12);
        }

        ctx.globalAlpha = 1;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [edges, nodeMap, isPhysicsRunning, theme, hoveredNode, searchQuery]);

  // Coordinate conversion helper
  const getGraphCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    return {
      x: (mouseX - transformRef.current.x) / transformRef.current.scale,
      y: (mouseY - transformRef.current.y) / transformRef.current.scale,
    };
  };

  // Find node under mouse
  const getNodeAtPos = (gx: number, gy: number): GraphNode | null => {
    for (const node of nodesRef.current) {
      const dx = node.x - gx;
      const dy = node.y - gy;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 4) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);
    const clickedNode = getNodeAtPos(coords.x, coords.y);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
    } else {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = coords.x;
      draggedNodeRef.current.y = coords.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      const node = getNodeAtPos(coords.x, coords.y);
      setHoveredNode(node);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getGraphCoords(e);
    const clickedNode = getNodeAtPos(coords.x, coords.y);
    if (clickedNode) {
      if (clickedNode.isDatabaseRow) {
        openRowModal(clickedNode.id);
      } else {
        navigateToPage(clickedNode.id);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(3, Math.max(0.2, transformRef.current.scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newScale / transformRef.current.scale);
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newScale / transformRef.current.scale);
    transformRef.current.scale = newScale;
  };

  const handleResetZoom = () => {
    if (canvasRef.current) {
      transformRef.current = {
        x: canvasRef.current.clientWidth / 2,
        y: canvasRef.current.clientHeight / 2,
        scale: 1,
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-[#f4f7fa] dark:bg-[#070b14] select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Title & Stats */}
        <div className="pointer-events-auto bg-white/90 dark:bg-[#0b111e]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-2.5 px-4 shadow-paper flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Share2 className="w-4 h-4 text-[#0284c7]" />
            <span>Knowledge Graph</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:border-slate-800" />
          <span className="font-mono text-slate-500">
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>

        {/* Filter, Search & View Controls */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-[#0b111e]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-1.5 shadow-paper text-xs">
          {/* Space Filter */}
          <select
            value={selectedSpaceId}
            onChange={e => setSelectedSpaceId(e.target.value)}
            className="bg-transparent border border-slate-200 dark:border-slate-700 px-2 py-1 outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Spaces</option>
            {spaces.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Search Node */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-50/50 dark:bg-slate-900/50">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <input
              type="text"
              placeholder="Find node..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-24 sm:w-32 text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle Orphans */}
          <button
            onClick={() => setShowOrphans(!showOrphans)}
            className={`px-2 py-1 border transition-colors ${
              showOrphans
                ? 'border-[#0284c7] text-[#0284c7] bg-sky-50 dark:bg-sky-950/40'
                : 'border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
            title="Toggle unlinked orphan notes"
          >
            Orphans
          </button>

          {/* Toggle Physics */}
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-none"
            title={isPhysicsRunning ? 'Pause simulation' : 'Run simulation'}
          >
            {isPhysicsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Zoom controls */}
          <button
            onClick={() => {
              transformRef.current.scale = Math.min(3, transformRef.current.scale * 1.2);
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              transformRef.current.scale = Math.max(0.2, transformRef.current.scale * 0.8);
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="Reset to center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Hover Info Card */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-[#0b111e]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-glass p-3 rounded-none text-xs max-w-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: hoveredNode.spaceColor }}
            />
            <span>{hoveredNode.spaceName}</span>
          </div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5 truncate">
            {hoveredNode.title}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{hoveredNode.degree} connected links</span>
            <span className="text-[#0284c7] flex items-center gap-0.5">
              Click to open <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}

      {/* Bottom Right Space Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/80 dark:bg-[#0b111e]/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-2 shadow-sm text-[10px] space-y-1">
        <div className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Spaces</div>
        {spaces.map(s => (
          <div key={s.id} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: spaceColorMap.get(s.id) }}
            />
            <span className="truncate max-w-[120px]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
