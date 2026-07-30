import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, startTopic, completeTopic } from '../api';
import type { RoadmapTopic } from '../types/roadmap.types';
import { RoadmapNode } from '../components/RoadmapNode';
import { TopicDetailModal } from '../components/TopicDetailModal';
import { FaRedo, FaTrophy, FaGraduationCap, FaAtom, FaBookOpen, FaRocket, FaCrown } from 'react-icons/fa';
import { XPBar } from '@/features/gamification/components/XPBar';
import { fetchXpSummary } from '@/features/gamification/api';
import type { XpSummary } from '@/features/gamification/types/gamification.types';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RoadmapUnit {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  topicIndexes: number[];
  side: 'left' | 'right';
  topPx: number;
}

interface DynamicUnit {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  topicIndexes: number[];
  side: 'left' | 'right';
}

const getUnitsForDomain = (domain: string, topics: RoadmapTopic[]): DynamicUnit[] => {
  if (domain === 'quantum-mechanics') {
    return [
      {
        id: 1,
        title: "UNIT 1: MATHEMATICAL FOUNDATIONS",
        subtitle: "History, Linear Algebra, Dirac Bra-Ket Notation & Hilbert Spaces.",
        icon: <FaAtom className="text-xl text-emerald-500" />,
        topicIndexes: [0, 1, 2, 3],
        side: 'left'
      },
      {
        id: 2,
        title: "UNIT 2: OPERATORS & POSTULATES",
        subtitle: "Unitary/Hermitian Matrices, Outer/Tensor Products & Quantum Postulates.",
        icon: <FaBookOpen className="text-xl text-emerald-500" />,
        topicIndexes: [4, 5, 6],
        side: 'right'
      },
      {
        id: 3,
        title: "UNIT 3: SPIN EXPERIMENTS & BLOCH GEOMETRY",
        subtitle: "Stern-Gerlach Experiment, Spin-1/2 & 3D Bloch Sphere Geometry.",
        icon: <FaCrown className="text-xl text-emerald-500" />,
        topicIndexes: [7, 8],
        side: 'left'
      }
    ];
  }

  if (domain === 'quantum-computing') {
    return [
      {
        id: 1,
        title: "UNIT 1: CIRCUIT MODEL & GATES",
        subtitle: "Circuit Architecture, Single & Multi-Qubit Gates, and IBM Qiskit SDK.",
        icon: <FaBookOpen className="text-xl text-emerald-500" />,
        topicIndexes: [0, 1, 2],
        side: 'left'
      },
      {
        id: 2,
        title: "UNIT 2: CORE QUANTUM ALGORITHMS",
        subtitle: "Phase Kickback, Deutsch-Jozsa, Bernstein-Vazirani & Grover's Search.",
        icon: <FaRocket className="text-xl text-emerald-500" />,
        topicIndexes: [3, 4, 5, 6],
        side: 'right'
      },
      {
        id: 3,
        title: "UNIT 3: ADVANCED FOURIER & FACTORING",
        subtitle: "Quantum Fourier Transform (QFT), QPE & Shor's Polynomial Factoring.",
        icon: <FaGraduationCap className="text-xl text-emerald-500" />,
        topicIndexes: [7, 8, 9],
        side: 'left'
      }
    ];
  }

  if (domain === 'quantum-communication') {
    return [
      {
        id: 1,
        title: "UNIT 1: ENTANGLEMENT PROTOCOLS",
        subtitle: "Bell States, Quantum Teleportation Protocol & Superdense Coding.",
        icon: <FaAtom className="text-xl text-emerald-500" />,
        topicIndexes: [0, 1, 2],
        side: 'left'
      },
      {
        id: 2,
        title: "UNIT 2: QUANTUM CRYPTOGRAPHY & QKD",
        subtitle: "No-Cloning Security & BB84 Quantum Key Distribution Protocol.",
        icon: <FaCrown className="text-xl text-emerald-500" />,
        topicIndexes: [3, 4],
        side: 'right'
      }
    ];
  }

  if (domain === 'quantum-machine-learning') {
    // Seven units over the 41 lectures, split where the MOOC itself changes
    // subject (see the quantum-machine-learning block in roadmap_seed.py).
    return [
      {
        id: 1,
        title: "UNIT 1: QUANTUM FORMALISM FOR LEARNING",
        subtitle: "Classical Probability, Quantum & Mixed States, Measurements, Closed & Open System Evolution.",
        icon: <FaAtom className="text-xl text-emerald-500" />,
        topicIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
        side: 'left'
      },
      {
        id: 2,
        title: "UNIT 2: ISING MODELS & MANY-BODY PHYSICS",
        subtitle: "Classical & Transverse Field Ising Models, plus Roger Melko's Many-Body Lectures.",
        icon: <FaBookOpen className="text-xl text-emerald-500" />,
        topicIndexes: [8, 9, 10, 11, 12],
        side: 'right'
      },
      {
        id: 3,
        title: "UNIT 3: COMPUTING PARADIGMS & OPTIMIZATION",
        subtitle: "Gate Model, Adiabatic Computing, Quantum Annealing, QAOA & Thermal State Sampling.",
        icon: <FaRocket className="text-xl text-emerald-500" />,
        topicIndexes: [13, 14, 15, 16, 17, 18],
        side: 'left'
      },
      {
        id: 4,
        title: "UNIT 4: VARIATIONAL CIRCUITS & SIMULATION",
        subtitle: "Alan Aspuru-Guzik's four-part series on variational algorithms and quantum simulation.",
        icon: <FaGraduationCap className="text-xl text-emerald-500" />,
        topicIndexes: [19, 20, 21, 22],
        side: 'right'
      },
      {
        id: 5,
        title: "UNIT 5: ENCODING & LEARNING ALGORITHMS",
        subtitle: "Encoding Classical Data, Ensembles, QBoost, Clustering, Kernels & Graphical Models.",
        icon: <FaBookOpen className="text-xl text-emerald-500" />,
        topicIndexes: [23, 24, 25, 26, 27, 28, 29, 30],
        side: 'left'
      },
      {
        id: 6,
        title: "UNIT 6: QUANTUM-ENHANCED KERNEL METHODS",
        subtitle: "Maria Schuld's three-part series on quantum feature maps and kernel estimation.",
        icon: <FaCrown className="text-xl text-emerald-500" />,
        topicIndexes: [31, 32, 33],
        side: 'right'
      },
      {
        id: 7,
        title: "UNIT 7: QUANTUM LINEAR ALGEBRA",
        subtitle: "QFT, Phase Estimation, HHL & Matrix Inversion, Gaussian Processes, Seth Lloyd Guest Lecture.",
        icon: <FaGraduationCap className="text-xl text-emerald-500" />,
        topicIndexes: [34, 35, 36, 37, 38, 39, 40],
        side: 'left'
      }
    ];
  }

  if (domain === 'quantum-hardware') {
    return [
      {
        id: 1,
        title: "UNIT 1: ERROR CORRECTION & FAULT TOLERANCE",
        subtitle: "Gottesman-Knill Theorem, Stabilizer Codes & 2D Lattice Surface Codes.",
        icon: <FaGraduationCap className="text-xl text-emerald-500" />,
        topicIndexes: [0, 1],
        side: 'left'
      }
    ];
  }

  return [
    {
      id: 1,
      title: "UNIT 1: QUANTUM MECHANICS & FOUNDATIONS",
      subtitle: "Linear Algebra, Dirac Notation, Hilbert Spaces, Unitary/Hermitian Matrices, Stern-Gerlach & Bloch Sphere.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      side: 'left'
    },
    {
      id: 2,
      title: "UNIT 2: QUANTUM COMPUTING & CIRCUIT MODEL",
      subtitle: "Circuit Architecture, Single & Multi-Qubit Gates, Qiskit SDK & Core Algorithms.",
      icon: <FaBookOpen className="text-xl text-emerald-500" />,
      topicIndexes: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      side: 'right'
    },
    {
      id: 3,
      title: "UNIT 3: QUANTUM COMMUNICATION & QKD",
      subtitle: "Bell States, Teleportation, Superdense Coding, No-Cloning & BB84 QKD.",
      icon: <FaRocket className="text-xl text-emerald-500" />,
      topicIndexes: [19, 20, 21, 22, 23],
      side: 'left'
    },
    {
      id: 4,
      title: "UNIT 4: HARDWARE & ERROR CORRECTION",
      subtitle: "Gottesman-Knill Theorem, Stabilizer Codes & Surface Codes.",
      icon: <FaGraduationCap className="text-xl text-emerald-500" />,
      topicIndexes: [24, 25],
      side: 'right'
    },
    {
      id: 5,
      title: "UNIT 5: QUANTUM MACHINE LEARNING (QML)",
      subtitle: "Data Encoding, Hamiltonian Maps, SWAP Test, Q-means & VQE/QAOA.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [26, 27, 28, 29, 30, 31],
      side: 'left'
    }
  ];
};

export const RoadmapPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const isDark = theme === 'dark';

  const [selectedTopic, setSelectedTopic] = useState<RoadmapTopic | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('quantum-computing');
  const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
  const riverContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    fetchXpSummary().then(setXpSummary).catch(console.error);
  }, [currentUser]);

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roadmap', selectedDomain],
    queryFn: () => fetchRoadmap(selectedDomain),
  });

  const topics: RoadmapTopic[] = response?.data || [];

  const startMutation = useMutation({
    mutationFn: startTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      if (selectedTopic) {
        setSelectedTopic(prev => prev ? { ...prev, user_status: 'in_progress', progress_pct: 0 } : null);
      }
    }
  });

  const completeMutation = useMutation({
    mutationFn: completeTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      if (selectedTopic) {
        setSelectedTopic(prev => prev ? { ...prev, user_status: 'completed', progress_pct: 100 } : null);
      }
      window.dispatchEvent(new CustomEvent('xp_updated'));
    }
  });

  const filteredTopics = selectedDomain === 'quantum-computing'
    ? topics
    : topics.filter(t => t.domain === selectedDomain);

  const completedCount = topics.filter(t => t.user_status === 'completed').length;
  const totalCount = topics.length;
  const overallProgressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const UNITS: RoadmapUnit[] = [
    {
      id: 1,
      title: "UNIT 1: QUANTUM FOUNDATIONS & LINEAR ALGEBRA",
      subtitle: "History, Linear Algebra, Dirac Notation, Hilbert Spaces, Unitary/Hermitian Matrices, Postulates, Stern-Gerlach & Bloch Sphere.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      side: 'left',
      topPx: 40
    },
    {
      id: 2,
      title: "UNIT 2: CIRCUIT MODEL & ENTANGLEMENT",
      subtitle: "Circuit Architecture, Single & Multi-Qubit Gates, Qiskit SDK, Bell States, Teleportation & Superdense Coding.",
      icon: <FaBookOpen className="text-xl text-emerald-500" />,
      topicIndexes: [9, 10, 11, 12, 13, 14],
      side: 'right',
      topPx: 1300
    },
    {
      id: 3,
      title: "UNIT 3: QUANTUM PRINCIPLES & CORE ALGORITHMS",
      subtitle: "Phase Kickback, Quantum Parallelism, No-Cloning Theorem, Deutsch-Jozsa, Bernstein-Vazirani & Grover's Search.",
      icon: <FaRocket className="text-xl text-emerald-500" />,
      topicIndexes: [15, 16, 17, 18, 19],
      side: 'left',
      topPx: 2140
    },
    {
      id: 4,
      title: "UNIT 4: ADVANCED ALGORITHMS & ERROR CORRECTION",
      subtitle: "Quantum Fourier Transform (QFT), Quantum Phase Estimation (QPE), Shor's Factoring, Gottesman-Knill & Surface Codes.",
      icon: <FaGraduationCap className="text-xl text-emerald-500" />,
      topicIndexes: [20, 21, 22, 23, 24],
      side: 'right',
      topPx: 2840
    },
    {
      id: 5,
      title: "UNIT 5: QUANTUM MACHINE LEARNING & ENCODING",
      subtitle: "Quantum Machine Learning (QML), Basis & Amplitude Encoding, Hamiltonian Encoding, SWAP Test & Q-means Clustering.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [25, 26, 27, 28, 29],
      side: 'left',
      topPx: 3540
    }
  ];

  const QUANTUM_COMMUNICATION_UNITS: RoadmapUnit[] = [
    {
      id: 1,
      title: "UNIT 1: QUANTUM COMMUNICATION FOUNDATIONS",
      subtitle: "Superposition, Entanglement, No-Cloning Theorem, Teleportation & Superdense Coding.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [0, 1, 2, 3],
      side: 'left',
      topPx: 40
    },
    {
      id: 2,
      title: "UNIT 2: QUANTUM KEY DISTRIBUTION (QKD)",
      subtitle: "BB84 Protocol, Conjugate Bases, Sifting, QBER Detection, E91 Entanglement & CHSH Inequality.",
      icon: <FaBookOpen className="text-xl text-emerald-500" />,
      topicIndexes: [4, 5],
      side: 'right',
      topPx: 750
    },
    {
      id: 3,
      title: "UNIT 3: REPEATERS, NETWORKS & SATELLITE QKD",
      subtitle: "Entanglement Swapping, Quantum Repeaters, Quantum Internet Architecture, Micius Satellite & Post-Quantum Cryptography.",
      icon: <FaRocket className="text-xl text-emerald-500" />,
      topicIndexes: [6, 7, 8, 9],
      side: 'left',
      topPx: 1200
    }
  ];

  // Seven units over the 41 MOOC lectures, split where the course itself
  // changes subject (see the quantum-machine-learning block in
  // backend/services/roadmap_seed.py). topPx is rendered from the first topic
  // index at draw time (dynamicTopPx below), so these are the same START_Y +
  // idx * Y_SPACING - 30 arithmetic, kept only to satisfy RoadmapUnit.
  const QUANTUM_ML_UNITS: RoadmapUnit[] = [
    {
      id: 1,
      title: "UNIT 1: QUANTUM FORMALISM FOR LEARNING",
      subtitle: "Classical Probability, Quantum & Mixed States, Measurements, Closed & Open System Evolution.",
      icon: <FaAtom className="text-xl text-emerald-500" />,
      topicIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
      side: 'left',
      topPx: 100
    },
    {
      id: 2,
      title: "UNIT 2: ISING MODELS & MANY-BODY PHYSICS",
      subtitle: "Classical & Transverse Field Ising Models, plus Roger Melko's three-part many-body series.",
      icon: <FaBookOpen className="text-xl text-emerald-500" />,
      topicIndexes: [8, 9, 10, 11, 12],
      side: 'right',
      topPx: 1500
    },
    {
      id: 3,
      title: "UNIT 3: COMPUTING PARADIGMS & OPTIMIZATION",
      subtitle: "Gate Model, Adiabatic Computing, Quantum Annealing, Implementations, QAOA & Thermal Sampling.",
      icon: <FaRocket className="text-xl text-emerald-500" />,
      topicIndexes: [13, 14, 15, 16, 17, 18],
      side: 'left',
      topPx: 2375
    },
    {
      id: 4,
      title: "UNIT 4: VARIATIONAL CIRCUITS & SIMULATION",
      subtitle: "Alan Aspuru-Guzik's four-part series on variational algorithms and quantum simulation.",
      icon: <FaGraduationCap className="text-xl text-emerald-500" />,
      topicIndexes: [19, 20, 21, 22],
      side: 'right',
      topPx: 3425
    },
    {
      id: 5,
      title: "UNIT 5: ENCODING & LEARNING ALGORITHMS",
      subtitle: "Encoding Classical Data, Ensembles, QBoost, Quantum Clustering, Kernels, Interference & Graphical Models.",
      icon: <FaBookOpen className="text-xl text-emerald-500" />,
      topicIndexes: [23, 24, 25, 26, 27, 28, 29, 30],
      side: 'left',
      topPx: 4125
    },
    {
      id: 6,
      title: "UNIT 6: QUANTUM-ENHANCED KERNEL METHODS",
      subtitle: "Maria Schuld's three-part series on quantum feature maps and kernel estimation.",
      icon: <FaCrown className="text-xl text-emerald-500" />,
      topicIndexes: [31, 32, 33],
      side: 'right',
      topPx: 5525
    },
    {
      id: 7,
      title: "UNIT 7: QUANTUM LINEAR ALGEBRA",
      subtitle: "QFT, Phase Estimation, HHL, Matrix Inversion, Learning Applications, Gaussian Processes & Seth Lloyd.",
      icon: <FaGraduationCap className="text-xl text-emerald-500" />,
      topicIndexes: [34, 35, 36, 37, 38, 39, 40],
      side: 'left',
      topPx: 6050
    }
  ];

  const UNITS_BY_DOMAIN: Record<string, RoadmapUnit[]> = {
    'quantum-communication': QUANTUM_COMMUNICATION_UNITS,
    'quantum-machine-learning': QUANTUM_ML_UNITS,
  };
  // Falls back to the quantum-computing UNITS, which is what every domain
  // without its own list got before.
  const activeUnits = UNITS_BY_DOMAIN[selectedDomain] ?? UNITS;

  // Evenly Spaced 5-Node Curve Distribution (Zero Overlap at Bends)
  const CANVAS_WIDTH = 900;
  const CENTER_X = CANVAS_WIDTH / 2; // 450px
  const Y_SPACING = 175; // 175px vertical spacing to prevent overlap between stage title pills and banners
  const START_Y = 130; // 130px start position giving clean 25px top clearance above Node 0

  // 5 nodes evenly distributed per curve sweep with generous breathing room
  const getNodeX = (idx: number) => {
    const amplitude = 270; // Sweeps horizontally from x = 180px to x = 720px
    return Math.round(Math.sin((idx + 0.5) * 0.62) * amplitude);
  };

  // Generate a silky smooth continuous cubic Bezier path using Catmull-Rom / Hermite spline tangents
  const generateFullRiverPath = (allTopics: RoadmapTopic[]) => {
    const N = allTopics.length;
    if (N <= 0) return "";

    // 1. Gather exact center coordinates for all nodes
    const pts = allTopics.map((_, idx) => ({
      x: CENTER_X + getNodeX(idx),
      y: START_Y + idx * Y_SPACING
    }));

    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    // 2. Compute smooth tangent vectors at each node for C1 continuity
    const tangents: { x: number; y: number }[] = [];
    const tension = 0.5;

    for (let i = 0; i < N; i++) {
      if (i === 0) {
        tangents.push({
          x: (pts[1].x - pts[0].x) * tension,
          y: (pts[1].y - pts[0].y) * tension
        });
      } else if (i === N - 1) {
        tangents.push({
          x: (pts[N - 1].x - pts[N - 2].x) * tension,
          y: (pts[N - 1].y - pts[N - 2].y) * tension
        });
      } else {
        tangents.push({
          x: (pts[i + 1].x - pts[i - 1].x) * tension,
          y: (pts[i + 1].y - pts[i - 1].y) * tension
        });
      }
    }

    // 3. Construct smooth Cubic Bezier path segments
    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < N - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const t1 = tangents[i];
      const t2 = tangents[i + 1];

      // Control points derived from node center tangents
      const cp1x = (p1.x + t1.x / 3).toFixed(2);
      const cp1y = (p1.y + t1.y / 3).toFixed(2);
      const cp2x = (p2.x - t2.x / 3).toFixed(2);
      const cp2y = (p2.y - t2.y / 3).toFixed(2);

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return pathD;
  };

  const scrollToUnit = (unitStartIdx: number) => {
    if (!riverContainerRef.current) return;
    const targetY = unitStartIdx * Y_SPACING;
    window.scrollTo({
      top: riverContainerRef.current.offsetTop + targetY - 100,
      behavior: 'smooth'
    });
  };

  const DOMAIN_FILTERS = [
    { id: 'quantum-computing', label: 'Quantum Computing', isReady: true, countDesc: '30 Lessons' },
    { id: 'quantum-communication', label: 'Quantum Communication', isReady: true, countDesc: '10 Lessons' },
    { id: 'quantum-machine-learning', label: 'Quantum Machine Learning', isReady: true, countDesc: '41 Lessons' },
    { id: 'quantum-hardware', label: 'Hardware & Fault Tolerance', isReady: false, countDesc: 'Coming Soon' }
  ];

  // Whether the selected track has a seeded curriculum, read off the flag above
  // instead of re-listing domain ids at each of the three places that used to
  // hardcode them — shipping a domain is now one flag flip, not a grep.
  const selectedDomainReady = DOMAIN_FILTERS.find(d => d.id === selectedDomain)?.isReady ?? false;

  const getDomainMetadata = (domain: string, totalStages: number) => {
    switch (domain) {
      case 'quantum-communication':
        return {
          title: "Quantum Communication Roadmap",
          description: `Master superposition, entanglement, no-cloning theorem, BB84 QKD, E91, and quantum repeaters across ${totalStages || 10} interactive levels.`
        };
      case 'quantum-machine-learning':
        return {
          title: "Quantum Machine Learning Roadmap",
          description: "Explore quantum state encoding, variational quantum circuits, Q-means, and hybrid QML algorithms."
        };
      case 'quantum-hardware':
        return {
          title: "Hardware & Fault Tolerance Roadmap",
          description: "Explore quantum error correction, Gottesman-Knill theorem, stabilizer codes, and 2D lattice surface codes."
        };
      case 'quantum-computing':
      default:
        return {
          title: "Quantum Computing Roadmap",
          description: `Master quantum linear algebra, circuit architecture, quantum gates, and core algorithms across ${totalStages || 30} interactive levels.`
        };
    }
  };

  const currentDomainMeta = getDomainMetadata(selectedDomain, filteredTopics.length);

  return (
    <div className={cn(
      "w-full h-full transition-colors duration-300 py-10 px-4 md:px-8 font-sans",
      isDark ? "text-white" : "text-zinc-900"
    )}>
      <div className="max-w-[1500px] mx-auto flex flex-col gap-8">
        {/* Hero Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-white/5">
          <div className="flex flex-col gap-3 max-w-2xl">
            <motion.h1
              key={selectedDomain + "-title"}
              className="text-4xl md:text-5xl font-sans tracking-tight font-normal"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {currentDomainMeta.title}
            </motion.h1>
            <motion.p
              key={selectedDomain + "-desc"}
              className={cn("text-base md:text-lg", isDark ? "text-zinc-400" : "text-zinc-600")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {currentDomainMeta.description}
            </motion.p>
          </div>

          {/* Stats Mastery Card (Enlarged & Prominent) */}
          <motion.div
            className={cn(
              "p-6 rounded-[2.2rem] border overflow-hidden shadow-md flex items-center gap-6 shrink-0 backdrop-blur-md transition-all",
              isDark ? "bg-zinc-950/80 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-emerald-500/5"
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 text-emerald-500 text-2xl",
              isDark ? "bg-black border-white/10" : "bg-emerald-50 border-emerald-200"
            )}>
              <FaTrophy />
            </div>

            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <div className="flex items-center justify-between gap-4 font-sans">
                <span className={cn("text-sm font-semibold tracking-tight", isDark ? "text-zinc-200" : "text-zinc-800")}>
                  Overall Mastery
                </span>
                <span className="font-mono text-emerald-500 font-bold text-lg">{overallProgressPct}%</span>
              </div>

              <div className={cn("w-48 sm:w-56 rounded-full h-3 overflow-hidden p-0.5 border", isDark ? "bg-black border-white/10" : "bg-zinc-100 border-zinc-200")}>
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  style={{ width: `${overallProgressPct}%` }}
                />
              </div>

              <span className={cn("text-xs font-mono font-medium block mt-0.5", isDark ? "text-zinc-400" : "text-zinc-600")}>
                {completedCount} of {totalCount} Stages Mastered
              </span>
            </div>
          </motion.div>
        </div>

        {/* Quantum Domain Tracks Selector Bar (Horizontally Aligned) */}
        <div className="flex flex-col gap-3">
          <span className={cn("text-xs font-mono uppercase tracking-widest font-semibold", isDark ? "text-zinc-400" : "text-zinc-600")}>
            Select Quantum Domain Track:
          </span>
          <div className="flex flex-wrap items-center gap-3.5 w-full">
            {DOMAIN_FILTERS.map(dom => {
              const isActive = selectedDomain === dom.id;
              // Live count for the track currently loaded, otherwise the
              // number advertised on the card ("6 Lessons" -> 6).
              const declaredCount = parseInt(dom.countDesc, 10) || 0;
              const domCount = isActive ? topics.length || declaredCount : declaredCount;
              return (
                <button
                  key={dom.id}
                  onClick={() => setSelectedDomain(dom.id)}
                  className={cn(
                    "px-5 py-3 rounded-2xl text-sm font-medium border flex items-center gap-3 transition-all duration-200 cursor-pointer shadow-sm active:scale-95 select-none",
                    isActive
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/25 scale-[1.02]"
                      : isDark
                        ? "bg-zinc-950/90 border-white/10 text-zinc-200 hover:border-emerald-500/50 hover:text-white"
                        : "bg-white border-zinc-250 text-zinc-800 hover:border-emerald-500/50 hover:text-zinc-900 shadow-sm"
                  )}
                >
                  <span className="font-sans font-semibold tracking-tight">{dom.label}</span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-black/25 text-white"
                      : isDark
                        ? "bg-zinc-900 text-zinc-400 border border-white/10"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  )}>
                    {domCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <XPBar xpSummary={xpSummary} loading={isLoading} />

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6 max-w-md mx-auto my-12 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={cn("text-xs font-mono animate-pulse", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Loading quantum saga map...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-4 bg-red-100/10 border border-red-500/20 text-red-500 rounded-lg text-center max-w-lg mx-auto my-12">
            <p className="text-sm font-sans mb-4">
              {(error as any)?.response?.data?.detail || 'Failed to load quantum roadmap topics.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <FaRedo /> Retry Loading
            </button>
          </div>
        )}

        {/* Upcoming Track Placeholder or Active Saga Map */}
        {!isLoading && !isError && !selectedDomainReady && (
          <div className={cn(
            "flex flex-col items-center justify-center p-12 my-8 rounded-[2.5rem] border text-center max-w-2xl mx-auto backdrop-blur-md transition-all",
            isDark ? "bg-zinc-950/80 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
          )}>
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-3xl flex items-center justify-center mb-4 shadow-inner">
              {/* No DOMAIN_FILTERS entry carries an icon, so the lookup always
                  fell through to this fallback. */}
              ⚛️
            </div>
            <h2 className="text-2xl font-sans font-normal tracking-tight mb-2">
              {DOMAIN_FILTERS.find(d => d.id === selectedDomain)?.label} Roadmap
            </h2>
            <p className={cn("text-sm font-sans max-w-md leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-zinc-600")}>
              Curriculum portions and learning materials for this roadmap will be updated shortly. Explore the complete 30-lesson Quantum Computing Roadmap in the meantime.
            </p>
            <button
              onClick={() => setSelectedDomain('quantum-computing')}
              className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs font-mono shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <FaRocket /> Return to Quantum Computing Roadmap (30 Lessons)
            </button>
          </div>
        )}

        {/* Evenly Spaced Winding Saga Map Container (Zero Overlap at Bends) */}
        {!isLoading && !isError && selectedDomainReady && (
          <div
            ref={riverContainerRef}
            className="relative w-full max-w-[1600px] mx-auto min-h-[2200px] flex justify-center py-4 overflow-visible"
          >
            {/* Center Canvas Container (900px wide, zero overlap) */}
            <div
              className="relative w-full max-w-[900px] shrink-0"
              style={{ height: `${filteredTopics.length * Y_SPACING + 120}px` }}
            >
              {/* Continuous SVG 3D Winding Game Road Ribbon */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
                viewBox={`0 0 ${CANVAS_WIDTH} ${filteredTopics.length * Y_SPACING + 120}`}
                preserveAspectRatio="xMidYMin meet"
              >
                {/* Outer Glow Path Ribbon */}
                <path
                  d={generateFullRiverPath(filteredTopics)}
                  fill="none"
                  stroke={isDark ? "#10b981" : "#059669"}
                  strokeWidth={isDark ? "24" : "28"}
                  strokeOpacity={isDark ? "0.15" : "0.30"}
                  strokeLinecap="round"
                />

                {/* Main Road Track Border */}
                <path
                  d={generateFullRiverPath(filteredTopics)}
                  fill="none"
                  stroke={isDark ? "#10b981" : "#047857"}
                  strokeWidth={isDark ? "8" : "14"}
                  strokeOpacity={isDark ? "0.5" : "0.95"}
                  strokeLinecap="round"
                />

                {/* Inner Dotted Lane Centerline */}
                <path
                  d={generateFullRiverPath(filteredTopics)}
                  fill="none"
                  stroke={isDark ? "#ffffff" : "#10b981"}
                  strokeWidth={isDark ? "3" : "4"}
                  strokeDasharray="6 8"
                  strokeOpacity={isDark ? "0.8" : "1"}
                  strokeLinecap="round"
                />
              </svg>

              {/* Level Nodes Layer */}
              {filteredTopics.map((topic, idx) => {
                const x = getNodeX(idx);
                const y = idx * Y_SPACING + START_Y;

                return (
                  <RoadmapNode
                    key={topic.slug}
                    topic={topic}
                    onSelectTopic={(t) => setSelectedTopic(t)}
                    isCurrentFocus={selectedTopic?.slug === topic.slug}
                    x={x}
                    y={y}
                  />
                );
              })}
            </div>

            {/* Dedicated Unit Overview Side Cards (Enlarged & Prominent) */}
            {activeUnits.map((unit) => {
              const unitTopics = filteredTopics.filter((_, idx) => unit.topicIndexes.includes(idx));
              const unitCompleted = unitTopics.filter(t => t.user_status === 'completed').length;
              const unitTotal = unitTopics.length;
              const unitProgressPct = unitTotal > 0 ? Math.round((unitCompleted / unitTotal) * 100) : 0;
              const firstTopicIdx = unit.topicIndexes[0];
              const dynamicTopPx = START_Y + firstTopicIdx * Y_SPACING - 30;

              return (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, x: unit.side === 'left' ? -25 : 25 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  style={{ top: `${dynamicTopPx}px` }}
                  className={cn(
                    "hidden xl:flex absolute w-[330px] 2xl:w-[360px] p-6 rounded-[2.2rem] border overflow-hidden shadow-lg flex-col gap-4 z-10 backdrop-blur-md transition-all duration-300 pointer-events-auto hover:shadow-xl hover:scale-[1.02]",
                    unit.side === 'left' ? "left-0" : "right-0",
                    isDark
                      ? "bg-zinc-950/90 border-white/10 hover:border-emerald-500/50 text-white"
                      : "bg-white/95 border-zinc-200 hover:border-emerald-500/40 text-zinc-900 shadow-emerald-500/5"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 text-xl",
                      isDark ? "bg-black border-white/10 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    )}>
                      {unit.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono text-emerald-500 uppercase tracking-widest font-semibold block">
                        Unit {unit.id} Guide
                      </span>
                      <h3 className="font-sans text-sm font-semibold tracking-tight leading-snug mt-0.5">
                        {unit.title}
                      </h3>
                    </div>
                  </div>

                  <p className={cn("text-xs leading-relaxed font-sans", isDark ? "text-zinc-300" : "text-zinc-600")}>
                    {unit.subtitle}
                  </p>

                  {/* Progress Bar & Counter */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>
                        {unitCompleted} of {unitTotal} Stages
                      </span>
                      <span className="text-emerald-500 font-bold text-sm">{unitProgressPct}%</span>
                    </div>

                    <div className={cn("w-full h-2 rounded-full overflow-hidden p-0.5 border", isDark ? "bg-black border-white/10" : "bg-zinc-100 border-zinc-200")}>
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        style={{ width: `${unitProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Jump Button */}
                  <button
                    onClick={() => scrollToUnit(firstTopicIdx)}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-mono font-medium border transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95",
                      isDark
                        ? "bg-zinc-900 border-white/10 text-zinc-200 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-black"
                        : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-50/50"
                    )}
                  >
                    <span>Scroll to Unit {unit.id}</span>
                    <FaRocket className="text-xs text-emerald-500" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Centered Modal for Topic Details */}
        {selectedTopic && (
          <TopicDetailModal
            topic={selectedTopic}
            allTopics={topics}
            onClose={() => setSelectedTopic(null)}
            onStart={async (slug) => {
              await startMutation.mutateAsync(slug);
            }}
            onComplete={async (slug) => {
              await completeMutation.mutateAsync(slug);
            }}
          />
        )}
      </div>
    </div>
  );
};
