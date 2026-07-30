import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import type { MindMapNode as MindMapNodeType, MindMapResult } from '../types';

interface MindMapViewerProps {
  result: MindMapResult;
  /** Overrides the default fixed inline height — pass "h-full" when this is
   * rendered inside a full-height container (e.g. MindMapModal). */
  className?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;

export const MindMapViewer: React.FC<MindMapViewerProps> = ({ result, className }) => {
  const { theme } = useTheme();

  const { nodes, edges } = useMemo(() => {
    const root = hierarchy<MindMapNodeType>(result.root, (d) => d.children);
    const layout = tree<MindMapNodeType>().nodeSize([NODE_HEIGHT + 24, NODE_WIDTH + 40]);
    const positioned = layout(root) as HierarchyPointNode<MindMapNodeType>;

    const idByNode = new Map<HierarchyPointNode<MindMapNodeType>, string>();
    positioned.each((d, i) => idByNode.set(d as HierarchyPointNode<MindMapNodeType>, `n-${i}`));

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    positioned.each((d) => {
      const point = d as HierarchyPointNode<MindMapNodeType>;
      const isRoot = point.depth === 0;
      flowNodes.push({
        id: idByNode.get(point)!,
        position: { x: point.y, y: point.x },
        data: { label: point.data.label },
        draggable: false,
        connectable: false,
        style: {
          width: NODE_WIDTH,
          padding: '10px 14px',
          borderRadius: 14,
          fontSize: isRoot ? 14 : 12,
          fontWeight: isRoot ? 600 : 500,
          textAlign: 'center',
          background: theme === 'dark' ? (isRoot ? '#09090b' : 'rgba(9,9,11,0.5)') : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#18181b',
          border: `1px solid ${
            theme === 'dark'
              ? isRoot ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'
              : isRoot ? 'rgba(16,185,129,0.4)' : '#e4e4e7'
          }`,
        },
      });

      if (point.parent) {
        const sourceId = idByNode.get(point.parent as HierarchyPointNode<MindMapNodeType>)!;
        const targetId = idByNode.get(point)!;
        flowEdges.push({
          id: `e-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          style: { stroke: theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#d4d4d8' },
        });
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [result, theme]);

  return (
    <div className={cn(
      "w-full rounded-2xl border overflow-hidden",
      className || "h-[420px]",
      theme === 'dark' ? "bg-black border-white/10" : "bg-zinc-50 border-zinc-200",
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={theme === 'dark' ? '#27272a' : '#e4e4e7'} gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
