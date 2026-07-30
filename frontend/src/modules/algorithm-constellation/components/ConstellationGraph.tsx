import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3Force from 'd3-force';
import * as d3Zoom from 'd3-zoom';
import * as d3Drag from 'd3-drag';
import { select } from 'd3-selection';
import type { AlgorithmSummary } from '../../algorithm-explorer/hooks/useAlgorithmApi';
import {
  getAlgorithmDomain,
  DOMAIN_COLORS,
  DOMAIN_CLUSTER_SEEDS,
} from '../utils/domainMapper';
import type { Domain } from '../utils/domainMapper';
import { getExploredSlugs } from '../hooks/useConstellationState';

interface GraphNode extends d3Force.SimulationNodeDatum {
  id: string;
  name: string;
  slug: string;
  domain: Domain;
  difficulty: string;
  status: string;
  level: number;
  isExplored: boolean;
  clusterX: number;
  clusterY: number;
}

interface GraphLink extends d3Force.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface ConstellationGraphProps {
  algorithms: AlgorithmSummary[];
  selectedSlug: string | null;
  searchQuery: string;
  filterDomain: string;
  filterDifficulty: string;
  filterStatus: string;
  hoveredDomain: string | null;
  onNodeSelect: (slug: string | null) => void;
  onNodeDoubleClick: (slug: string) => void;
  onCameraChange: (camera: { x: number; y: number; k: number }) => void;
  initialCamera: { x: number; y: number; k: number };
}

const WIDTH = 1000;
const HEIGHT = 680;

function nodeRadius(level: number): number {
  // level 1-9 → radius 8-22
  return 8 + (level - 1) * 1.6;
}

export const ConstellationGraph: React.FC<ConstellationGraphProps> = ({
  algorithms,
  selectedSlug,
  searchQuery,
  filterDomain,
  filterDifficulty,
  filterStatus,
  hoveredDomain,
  onNodeSelect,
  onNodeDoubleClick,
  onCameraChange,
  initialCamera,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simulationRef = useRef<d3Force.Simulation<GraphNode, GraphLink> | null>(null);
  const transformRef = useRef(d3Zoom.zoomIdentity.translate(initialCamera.x, initialCamera.y).scale(initialCamera.k));
  const exploredRef = useRef(getExploredSlugs());

  // Build nodes + links from algorithm list
  const { nodes, links } = useMemo(() => {
    const explored = exploredRef.current;
    const nodeList: GraphNode[] = algorithms.map(alg => {
      const domain = getAlgorithmDomain(alg.category || '', alg.name);
      const seed = DOMAIN_CLUSTER_SEEDS[domain] ?? DOMAIN_CLUSTER_SEEDS['Other'];
      // Scatter nodes around their cluster seed
      const angle = Math.random() * 2 * Math.PI;
      const radius = 30 + Math.random() * 60;
      return {
        id: alg.slug,
        name: alg.name,
        slug: alg.slug,
        domain,
        difficulty: alg.difficulty || 'Intermediate',
        status: alg.status || 'active',
        level: alg.learningLevel || 1,
        isExplored: explored.has(alg.slug),
        clusterX: seed.x + Math.cos(angle) * radius,
        clusterY: seed.y + Math.sin(angle) * radius,
        x: seed.x + Math.cos(angle) * radius,
        y: seed.y + Math.sin(angle) * radius,
      };
    });

    const slugSet = new Set(nodeList.map(n => n.id));
    const linkList: GraphLink[] = [];
    const linkSet = new Set<string>();

    algorithms.forEach(alg => {
      const relatedArr: string[] = (alg as any).relatedAlgorithms ?? [];
      relatedArr.forEach(relName => {
        // relName could be a slug or a name — try to match
        const target = nodeList.find(
          n => n.slug === relName || n.name.toLowerCase() === relName.toLowerCase()
        );
        if (target && target.id !== alg.slug && slugSet.has(target.id)) {
          const key = [alg.slug, target.id].sort().join('--');
          if (!linkSet.has(key)) {
            linkSet.add(key);
            linkList.push({ source: alg.slug, target: target.id });
          }
        }
      });
    });

    return { nodes: nodeList, links: linkList };
  }, [algorithms]);

  // Highlight logic
  const getNodeOpacity = useCallback((node: GraphNode): number => {
    const hasSearch = searchQuery.trim() !== '';
    const hasDomainFilter = filterDomain !== 'All';
    const hasDiffFilter = filterDifficulty !== 'All';
    const hasStatusFilter = filterStatus !== 'All';
    const hasDomainHover = hoveredDomain !== null;

    let dim = false;

    if (hasSearch) {
      const q = searchQuery.toLowerCase();
      dim = !node.name.toLowerCase().includes(q) &&
            !node.domain.toLowerCase().includes(q) &&
            !node.slug.toLowerCase().includes(q);
    }
    if (hasDomainFilter && filterDomain !== 'All') {
      if (node.domain !== filterDomain) dim = true;
    }
    if (hasDiffFilter && filterDifficulty !== 'All') {
      if (!node.difficulty.toLowerCase().includes(filterDifficulty.toLowerCase())) dim = true;
    }
    if (hasStatusFilter) {
      if (filterStatus === 'Explored' && !node.isExplored) dim = true;
      if (filterStatus === 'Not Explored' && node.isExplored) dim = true;
      if (filterStatus === 'Available' && node.status === 'coming_soon') dim = true;
      if (filterStatus === 'Coming Soon' && node.status !== 'coming_soon') dim = true;
    }
    if (hasDomainHover && node.domain !== hoveredDomain) dim = true;

    if (selectedSlug) {
      // Only the selected node and its links should be full opacity
      // (handled below in edge highlighting; nodes not connected to selected are dimmed)
    }

    return dim ? 0.12 : 1;
  }, [searchQuery, filterDomain, filterDifficulty, filterStatus, hoveredDomain, selectedSlug]);

  // Initialize simulation
  useEffect(() => {
    if (!gRef.current || nodes.length === 0) return;

    const g = select(gRef.current);
    g.selectAll('*').remove();

    // Create force simulation
    const sim = d3Force.forceSimulation<GraphNode, GraphLink>(nodes)
      .force('link', d3Force.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80).strength(0.3))
      .force('charge', d3Force.forceManyBody().strength(-180).distanceMax(300))
      .force('collision', d3Force.forceCollide<GraphNode>().radius(d => nodeRadius(d.level) + 14).strength(0.85))
      .force('clusterX', d3Force.forceX<GraphNode>().x(d => d.clusterX).strength(0.12))
      .force('clusterY', d3Force.forceY<GraphNode>().y(d => d.clusterY).strength(0.12))
      .alphaDecay(0.022);

    simulationRef.current = sim;

    // Draw domain halo backgrounds (soft circles behind each galaxy)
    const domainGroups: Partial<Record<string, { cx: number; cy: number; color: string }>> = {};
    Object.entries(DOMAIN_CLUSTER_SEEDS).forEach(([domain, seed]) => {
      const dc = DOMAIN_COLORS[domain as Domain];
      if (dc) domainGroups[domain] = { cx: seed.x, cy: seed.y, color: dc.hex };
    });

    const haloLayer = g.append('g').attr('class', 'halos');
    Object.entries(domainGroups).forEach(([domain, info]) => {
      if (!info) return;
      haloLayer.append('circle')
        .attr('cx', info.cx)
        .attr('cy', info.cy)
        .attr('r', 110)
        .attr('fill', info.color)
        .attr('fill-opacity', 0.04)
        .attr('stroke', info.color)
        .attr('stroke-opacity', 0.1)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');

      haloLayer.append('text')
        .attr('x', info.cx)
        .attr('y', info.cy - 120)
        .attr('text-anchor', 'middle')
        .attr('fill', info.color)
        .attr('font-size', 11)
        .attr('opacity', 0.5)
        .attr('font-family', 'var(--font-sans, ui-sans-serif)')
        .attr('letter-spacing', '0.08em')
        .attr('text-transform', 'uppercase')
        .text(domain.toUpperCase());
    });

    // Draw links
    const linkLayer = g.append('g').attr('class', 'links');
    const linkEls = linkLayer.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#71717a')
      .attr('stroke-opacity', 0.18)
      .attr('stroke-width', 1);

    // Draw nodes
    const nodeLayer = g.append('g').attr('class', 'nodes');
    const nodeGroups = nodeLayer.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', d => d.status === 'coming_soon' ? 'default' : 'pointer')
      .call(
        d3Drag.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Glow filter per status
    const defs = g.append('defs');
    ['explored', 'selected', 'default'].forEach(filterType => {
      const flt = defs.append('filter').attr('id', `glow-${filterType}`);
      flt.append('feGaussianBlur')
        .attr('stdDeviation', filterType === 'selected' ? 5 : filterType === 'explored' ? 3 : 2)
        .attr('result', 'coloredBlur');
      const feMerge = flt.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Node glow circle (behind main circle)
    nodeGroups.append('circle')
      .attr('r', d => nodeRadius(d.level) + 5)
      .attr('fill', d => DOMAIN_COLORS[d.domain]?.hex ?? '#71717a')
      .attr('fill-opacity', d => {
        if (d.slug === selectedSlug) return 0.35;
        if (d.isExplored) return 0.18;
        return 0.06;
      })
      .attr('class', 'glow-ring');

    // Main node circle
    nodeGroups.append('circle')
      .attr('r', d => nodeRadius(d.level))
      .attr('fill', d => DOMAIN_COLORS[d.domain]?.hex ?? '#71717a')
      .attr('fill-opacity', d => d.status === 'coming_soon' ? 0.3 : 0.85)
      .attr('stroke', d => d.slug === selectedSlug ? '#fff' : DOMAIN_COLORS[d.domain]?.hex ?? '#71717a')
      .attr('stroke-width', d => d.slug === selectedSlug ? 2 : 0.8)
      .attr('stroke-opacity', 0.6)
      .attr('class', 'main-circle');

    // Explored indicator dot
    nodeGroups.filter(d => d.isExplored)
      .append('circle')
      .attr('r', 3)
      .attr('cx', d => nodeRadius(d.level) - 3)
      .attr('cy', d => -nodeRadius(d.level) + 3)
      .attr('fill', '#22d3ee')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5);

    // Node label
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d.level) + 12)
      .attr('fill', '#e4e4e7')
      .attr('font-size', d => d.level >= 7 ? 10 : 9)
      .attr('font-family', 'var(--font-sans, ui-sans-serif)')
      .attr('pointer-events', 'none')
      .attr('class', 'node-label')
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name);

    // Hover interactions
    nodeGroups
      .on('mouseenter', function (_, d) {
        select(this).select('.main-circle').transition().duration(200)
          .attr('r', nodeRadius(d.level) * 1.25);
        select(this).select('.glow-ring').transition().duration(200)
          .attr('fill-opacity', 0.45);
        select(this).select('.node-label')
          .text(d.name) // show full name on hover
          .attr('font-size', 10);
      })
      .on('mouseleave', function (_, d) {
        select(this).select('.main-circle').transition().duration(200)
          .attr('r', nodeRadius(d.level));
        select(this).select('.glow-ring').transition().duration(200)
          .attr('fill-opacity', d.slug === selectedSlug ? 0.35 : d.isExplored ? 0.18 : 0.06);
        select(this).select('.node-label')
          .text(d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name)
          .attr('font-size', d.level >= 7 ? 10 : 9);
      })
      .on('click', (_, d) => {
        if (d.status !== 'coming_soon') {
          onNodeSelect(d.slug === selectedSlug ? null : d.slug);
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        if (d.status !== 'coming_soon') {
          onNodeDoubleClick(d.slug);
        }
      });

    // Tick update
    sim.on('tick', () => {
      linkEls
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);

      nodeGroups.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [nodes, links]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update opacity when filters change (without restarting simulation)
  useEffect(() => {
    if (!gRef.current) return;
    const g = select(gRef.current);
    g.selectAll<SVGGElement, GraphNode>('g.node').each(function (d) {
      const opacity = getNodeOpacity(d);
      select(this).transition().duration(300).attr('opacity', opacity);
    });
  }, [getNodeOpacity]);

  // Highlight selected node's edges
  useEffect(() => {
    if (!gRef.current) return;
    const g = select(gRef.current);

    if (!selectedSlug) {
      g.selectAll<SVGLineElement, GraphLink>('line')
        .transition().duration(300)
        .attr('stroke-opacity', 0.18)
        .attr('stroke-width', 1);
      return;
    }

    g.selectAll<SVGLineElement, GraphLink>('line').each(function (d) {
      const srcId = typeof d.source === 'string' ? d.source : (d.source as GraphNode).id;
      const tgtId = typeof d.target === 'string' ? d.target : (d.target as GraphNode).id;
      const isConnected = srcId === selectedSlug || tgtId === selectedSlug;
      select(this).transition().duration(300)
        .attr('stroke-opacity', isConnected ? 0.7 : 0.07)
        .attr('stroke-width', isConnected ? 2 : 0.8)
        .attr('stroke', isConnected ? '#34d399' : '#71717a');
    });
  }, [selectedSlug]);

  // Set up zoom/pan
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        g.attr('transform', event.transform.toString());
        // Debounced camera save
        onCameraChange({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
      });

    svg.call(zoom);
    // Apply initial camera
    const t = d3Zoom.zoomIdentity
      .translate(initialCamera.x || 0, initialCamera.y || 0)
      .scale(initialCamera.k || 1);
    svg.call(zoom.transform, t);

    // Click on empty SVG → deselect
    svg.on('click.deselect', (event) => {
      if ((event.target as SVGElement).tagName === 'svg') {
        onNodeSelect(null);
      }
    });

    return () => {
      svg.on('.zoom', null);
      svg.on('click.deselect', null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ background: 'transparent', display: 'block' }}
    >
      <g ref={gRef} />
    </svg>
  );
};
