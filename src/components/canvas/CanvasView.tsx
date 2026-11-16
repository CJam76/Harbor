import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutGrid,
  Plus,
  Type,
  FileText,
  Image as ImageIcon,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ExternalLink,
  Edit2,
  Check,
  X,
  Star,
  Move,
  Link2,
  ArrowRight
} from 'lucide-react';
import { Canvas, CanvasNode, CanvasEdge, CanvasNodeType, Page } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';

export interface CanvasViewProps {
  canvasId?: string;
}

const ACCENT_COLORS: Record<string, { border: string; bg: string; text: string; header: string }> = {
  blue: {
    border: 'border-[#0284c7]',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-[#0284c7]',
    header: 'bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900/60',
  },
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-emerald-500',
    header: 'bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-amber-500',
    header: 'bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/60',
  },
  rose: {
    border: 'border-rose-500',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-rose-500',
    header: 'bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/60',
  },
  purple: {
    border: 'border-purple-500',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-purple-500',
    header: 'bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/60',
  },
  slate: {
    border: 'border-slate-400 dark:border-slate-600',
    bg: 'bg-white dark:bg-[#0b1120]',
    text: 'text-slate-500',
    header: 'bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700',
  },
};

export const CanvasView: React.FC<CanvasViewProps> = ({ canvasId }) => {
  const {
    canvases,
    activeCanvasId,
    updateCanvas,
    deleteCanvas,
    pages,
    navigateToPage,
    toggleFavorite,
  } = useWorkspace();

  const effectiveCanvasId = canvasId || activeCanvasId;
  const canvas = canvases.find(c => c.id === effectiveCanvasId);

  // Viewport Transform (Pan & Zoom)
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [zoom, setZoom] = useState(1);

  // Active interaction states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [notePickerNodeId, setNotePickerNodeId] = useState<string | null>(null);

  // Canvas panning drag state
  const isCanvasDragging = useRef(false);
  const canvasDragStart = useRef({ x: 0, y: 0 });

  // Node moving drag state
  const isNodeDragging = useRef(false);
  const draggedNodeId = useRef<string | null>(null);
  const nodeDragOffset = useRef({ x: 0, y: 0 });

  // Node resizing state
  const isNodeResizing = useRef(false);
  const resizingNodeId = useRef<string | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Local nodes and edges cache for smooth 60fps drag
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);

  useEffect(() => {
    if (canvas) {
      setNodes(canvas.data?.nodes || []);
      setEdges(canvas.data?.edges || []);
    }
  }, [canvas?.id]);

  // Sync changes to persistent storage
  const syncToStorage = useCallback(
    (newNodes: CanvasNode[], newEdges: CanvasEdge[]) => {
      if (!canvas) return;
      updateCanvas({
        id: canvas.id,
        data: { nodes: newNodes, edges: newEdges },
      });
    },
    [canvas, updateCanvas]
  );

  // Center & Fit all nodes
  const fitToScreen = () => {
    if (nodes.length === 0) {
      setPan({ x: 100, y: 80 });
      setZoom(1);
      return;
    }
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + n.height));

    const padding = 100;
    const targetW = maxX - minX + padding * 2;
    const targetH = maxY - minY + padding * 2;

    const scaleX = window.innerWidth / targetW;
    const scaleY = (window.innerHeight - 120) / targetH;
    const newZoom = Math.max(0.4, Math.min(1.2, Math.min(scaleX, scaleY)));

    setZoom(newZoom);
    setPan({
      x: -minX * newZoom + padding * newZoom,
      y: -minY * newZoom + padding * newZoom,
    });
  };

  // Add a new node to canvas
  const handleAddNode = (type: CanvasNodeType) => {
    if (!canvas) return;

    // Place near current center of screen
    const centerX = (-pan.x + window.innerWidth / 2) / zoom;
    const centerY = (-pan.y + (window.innerHeight - 120) / 2) / zoom;

    const newNode: CanvasNode = {
      id: `cnode-${Date.now()}`,
      type,
      x: Math.round(centerX - 140),
      y: Math.round(centerY - 80),
      width: type === 'text' ? 280 : type === 'file' ? 320 : 300,
      height: type === 'text' ? 180 : type === 'file' ? 220 : 240,
      color: type === 'text' ? 'blue' : type === 'file' ? 'emerald' : 'purple',
      title: type === 'text' ? 'New Note' : type === 'file' ? 'Note Embed' : 'Image Card',
      text: type === 'text' ? 'Double click or click edit to write markdown content here...' : undefined,
      url: type === 'image' ? 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80' : undefined,
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    syncToStorage(nextNodes, edges);
    setSelectedNodeId(newNode.id);
  };

  // Delete selected node
  const handleDeleteNode = (id: string) => {
    const nextNodes = nodes.filter(n => n.id !== id);
    const nextEdges = edges.filter(e => e.fromNode !== id && e.toNode !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    syncToStorage(nextNodes, nextEdges);
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Delete edge
  const handleDeleteEdge = (id: string) => {
    const nextEdges = edges.filter(e => e.id !== id);
    setEdges(nextEdges);
    syncToStorage(nodes, nextEdges);
  };

  // Connect nodes
  const handleStartConnect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingSourceId === nodeId) {
      setConnectingSourceId(null);
    } else if (!connectingSourceId) {
      setConnectingSourceId(nodeId);
    } else {
      // Connect source to target
      if (connectingSourceId !== nodeId) {
        const newEdge: CanvasEdge = {
          id: `cedge-${Date.now()}`,
          fromNode: connectingSourceId,
          toNode: nodeId,
          color: 'blue',
        };
        const nextEdges = [...edges, newEdge];
        setEdges(nextEdges);
        syncToStorage(nodes, nextEdges);
      }
      setConnectingSourceId(null);
    }
  };

  // Canvas Mouse events (Pan)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-background')) {
      return;
    }
    isCanvasDragging.current = true;
    canvasDragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setSelectedNodeId(null);
    setConnectingSourceId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCanvasDragging.current) {
      setPan({
        x: e.clientX - canvasDragStart.current.x,
        y: e.clientY - canvasDragStart.current.y,
      });
    } else if (isNodeDragging.current && draggedNodeId.current) {
      const id = draggedNodeId.current;
      const newX = (e.clientX - nodeDragOffset.current.x - pan.x) / zoom;
      const newY = (e.clientY - nodeDragOffset.current.y - pan.y) / zoom;
      setNodes(prev =>
        prev.map(n => (n.id === id ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n))
      );
    } else if (isNodeResizing.current && resizingNodeId.current) {
      const id = resizingNodeId.current;
      const deltaX = (e.clientX - resizeStartPos.current.x) / zoom;
      const deltaY = (e.clientY - resizeStartPos.current.y) / zoom;
      const newW = Math.max(160, Math.round(resizeStartPos.current.w + deltaX));
      const newH = Math.max(100, Math.round(resizeStartPos.current.h + deltaY));
      setNodes(prev =>
        prev.map(n => (n.id === id ? { ...n, width: newW, height: newH } : n))
      );
    }
  };

  const handleMouseUp = () => {
    if (isNodeDragging.current || isNodeResizing.current) {
      syncToStorage(nodes, edges);
    }
    isCanvasDragging.current = false;
    isNodeDragging.current = false;
    isNodeResizing.current = false;
    draggedNodeId.current = null;
    resizingNodeId.current = null;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = direction > 0 ? Math.min(2.5, zoom * zoomFactor) : Math.max(0.25, zoom / zoomFactor);

    // Zoom towards mouse pointer
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Node Drag start
  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingSourceId) {
      if (connectingSourceId !== id) {
        const newEdge: CanvasEdge = {
          id: `cedge-${Date.now()}`,
          fromNode: connectingSourceId,
          toNode: id,
          color: 'blue',
        };
        const nextEdges = [...edges, newEdge];
        setEdges(nextEdges);
        syncToStorage(nodes, nextEdges);
      }
      setConnectingSourceId(null);
      return;
    }

    setSelectedNodeId(id);
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    isNodeDragging.current = true;
    draggedNodeId.current = id;
    nodeDragOffset.current = {
      x: e.clientX - (node.x * zoom + pan.x),
      y: e.clientY - (node.y * zoom + pan.y),
    };
  };

  // Node Resize start
  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    isNodeResizing.current = true;
    resizingNodeId.current = id;
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: node.width,
      h: node.height,
    };
  };

  // Node map for fast coordinate lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  if (!canvas) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-sm">
        <LayoutGrid className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
        <span className="font-medium text-slate-600 dark:text-slate-300">No Canvas Selected</span>
        <p className="text-xs text-slate-400 mt-1">Select or create an Obsidian Canvas whiteboard from the sidebar.</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative select-none bg-[#f8fafc] dark:bg-[#070b14]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Canvas Toolbar */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Canvas Title & Favorite */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 dark:bg-[#0b1120]/95 border border-slate-200 dark:border-slate-800 shadow-glass px-3.5 py-1.5 backdrop-blur-md">
          <LayoutGrid className="w-4 h-4 text-[#0284c7]" />
          <input
            type="text"
            value={canvas.title}
            onChange={e => updateCanvas({ id: canvas.id, title: e.target.value })}
            className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none w-48 sm:w-64"
            placeholder="Canvas Title..."
          />
          <button
            type="button"
            onClick={() => toggleFavorite(canvas.id, 'canvas')}
            className={`p-1 hover:text-amber-500 transition-colors ${
              canvas.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
            }`}
            title="Star Canvas"
          >
            <Star className={`w-3.5 h-3.5 ${canvas.isFavorite ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* Center: Quick Add Nodes Bar */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-[#0b1120]/95 border border-slate-200 dark:border-slate-800 shadow-glass px-2 py-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleAddNode('text')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Type className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>+ Text</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('file')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>+ Note</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('image')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
            <span>+ Image</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Delete */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-[#0b1120]/95 border border-slate-200 dark:border-slate-800 shadow-glass px-2 py-1 backdrop-blur-md text-xs">
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(2.5, z * 1.15))}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1.5 text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.25, z / 1.15))}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitToScreen}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 100, y: 80 });
            }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Reset (100%)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <div className="w-px h-3.5 bg-slate-200 dark:border-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete canvas "${canvas.title}"?`)) {
                deleteCanvas(canvas.id);
              }
            }}
            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
            title="Delete Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Connecting mode banner */}
      {connectingSourceId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-[#0284c7] text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-bounce">
          <span>Click target card to complete connection arrow</span>
          <button
            type="button"
            onClick={() => setConnectingSourceId(null)}
            className="p-0.5 hover:bg-white/20"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Plane */}
      <div
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden canvas-background"
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        {/* SVG Blueprint & Dot Matrix Grid Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern
              id="canvas-grid"
              width={24 * zoom}
              height={24 * zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % (24 * zoom)}, ${pan.y % (24 * zoom)})`}
            >
              <circle
                cx={2}
                cy={2}
                r={1}
                className="fill-slate-300/70 dark:fill-slate-800/80"
              />
            </pattern>

            {/* Arrowhead marker for edges */}
            <marker
              id="canvas-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#canvas-grid)" />

          {/* Connection Lines (Edges) */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {edges.map(edge => {
              const s = nodeMap.get(edge.fromNode);
              const t = nodeMap.get(edge.toNode);
              if (!s || !t) return null;

              // Calculate connection points from center of edges
              const x1 = s.x + s.width / 2;
              const y1 = s.y + s.height / 2;
              const x2 = t.x + t.width / 2;
              const y2 = t.y + t.height / 2;

              // Bezier curve controls
              const dx = (x2 - x1) / 2;
              const dy = (y2 - y1) / 2;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={edge.id} className="group/edge cursor-pointer pointer-events-auto">
                  {/* Invisible wide hit area */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    onClick={() => handleDeleteEdge(edge.id)}
                  />
                  {/* Visible directional spline */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2}
                    markerEnd="url(#canvas-arrow)"
                    className="group-hover/edge:stroke-rose-500 transition-colors"
                  />
                  {/* Edge label */}
                  {edge.label && (
                    <text
                      x={midX}
                      y={midY - 8}
                      textAnchor="middle"
                      className="fill-slate-600 dark:fill-slate-300 font-mono text-[10px] bg-white"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Scaled & Panned Nodes Plane */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectingSourceId === node.id;
            const colorScheme = ACCENT_COLORS[node.color || 'blue'] || ACCENT_COLORS.blue;
            const embeddedPage = node.fileId ? pages.find(p => p.id === node.fileId) : null;

            return (
              <div
                key={node.id}
                onMouseDown={e => handleNodeMouseDown(node.id, e)}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
                className={`pointer-events-auto shadow-md border-2 transition-shadow flex flex-col overflow-hidden select-text group/card ${
                  colorScheme.bg
                } ${colorScheme.border} ${
                  isSelected ? 'ring-2 ring-[#0284c7] shadow-glass' : ''
                } ${isConnectingSource ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
              >
                {/* Card Header (Drag handle & controls) */}
                <div
                  className={`px-3 py-1.5 flex items-center justify-between cursor-move select-none ${colorScheme.header}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    {node.type === 'text' && <Type className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />}
                    {node.type === 'file' && <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {node.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                    <input
                      type="text"
                      value={node.title || ''}
                      onChange={e => {
                        const next = nodes.map(n =>
                          n.id === node.id ? { ...n, title: e.target.value } : n
                        );
                        setNodes(next);
                        syncToStorage(next, edges);
                      }}
                      className="font-semibold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none truncate"
                      placeholder="Card Title..."
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    {/* Link / Connect Trigger */}
                    <button
                      type="button"
                      onClick={e => handleStartConnect(node.id, e)}
                      className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors ${
                        isConnectingSource ? 'text-amber-500' : ''
                      }`}
                      title="Draw connection arrow"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>

                    {/* Delete node */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex-1 p-3 overflow-y-auto text-xs text-slate-700 dark:text-slate-200">
                  {/* TEXT CARD */}
                  {node.type === 'text' && (
                    <textarea
                      value={node.text || ''}
                      onChange={e => {
                        const next = nodes.map(n =>
                          n.id === node.id ? { ...n, text: e.target.value } : n
                        );
                        setNodes(next);
                        syncToStorage(next, edges);
                      }}
                      className="w-full h-full bg-transparent border-none outline-none resize-none font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                      placeholder="Write markdown note..."
                    />
                  )}

                  {/* FILE / NOTE EMBED CARD */}
                  {node.type === 'file' && (
                    <div className="flex flex-col h-full justify-between">
                      {embeddedPage ? (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {embeddedPage.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigateToPage(embeddedPage.id)}
                                className="text-[#0284c7] hover:underline flex items-center gap-0.5 text-[10px]"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-4 leading-relaxed font-sans">
                              {embeddedPage.content.substring(0, 200)}...
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNotePickerNodeId(node.id)}
                            className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                          >
                            Change embedded page
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-3">
                          <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                          <span className="text-slate-400 text-xs mb-2">No note selected</span>
                          <button
                            type="button"
                            onClick={() => setNotePickerNodeId(node.id)}
                            className="px-2.5 py-1 bg-[#0284c7] text-white text-[11px] font-medium"
                          >
                            Select Note to Embed
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* IMAGE CARD */}
                  {node.type === 'image' && (
                    <div className="flex flex-col h-full">
                      {node.url ? (
                        <div className="relative flex-1 overflow-hidden group/img">
                          <img
                            src={node.url}
                            alt={node.title || 'Canvas Image'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                          <input
                            type="text"
                            placeholder="Paste image URL..."
                            className="w-full text-xs p-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                            onBlur={e => {
                              const next = nodes.map(n =>
                                n.id === node.id ? { ...n, url: e.target.value } : n
                              );
                              setNodes(next);
                              syncToStorage(next, edges);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Card Color Picker & Resize Handle */}
                <div className="px-2 py-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between select-none">
                  {/* Colors */}
                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    {(['blue', 'emerald', 'amber', 'rose', 'purple', 'slate'] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          const next = nodes.map(n =>
                            n.id === node.id ? { ...n, color } : n
                          );
                          setNodes(next);
                          syncToStorage(next, edges);
                        }}
                        className={`w-2.5 h-2.5 rounded-full border border-black/20 ${
                          color === 'blue'
                            ? 'bg-sky-500'
                            : color === 'emerald'
                            ? 'bg-emerald-500'
                            : color === 'amber'
                            ? 'bg-amber-500'
                            : color === 'rose'
                            ? 'bg-rose-500'
                            : color === 'purple'
                            ? 'bg-purple-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Resize corner handle */}
                  <div
                    onMouseDown={e => handleResizeStart(node.id, e)}
                    className="w-3 h-3 cursor-nwse-resize text-slate-300 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center"
                    title="Drag to resize"
                  >
                    ◿
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note Picker Modal for Embedded Note Cards */}
      {notePickerNodeId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setNotePickerNodeId(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-glass p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-sm">Select Note to Embed</span>
              <button
                type="button"
                onClick={() => setNotePickerNodeId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {pages
                .filter(p => !p.isDeleted && !p.isDatabaseRow)
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const next = nodes.map(n =>
                        n.id === notePickerNodeId ? { ...n, fileId: p.id, title: p.title } : n
                      );
                      setNodes(next);
                      syncToStorage(next, edges);
                      setNotePickerNodeId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{p.title || 'Untitled Note'}</span>
                    <span className="text-[10px] text-slate-400">Embed</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
