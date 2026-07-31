import { useEffect, useRef, useState } from 'react';
import { BlochSphere3D } from '@/components/bloch/components/BlochSphere3D';
import type { BlochVector } from '@/components/bloch/types/quantum';

// Landing hero background — reuses the same glass-sphere/glowing-arrow visual
// from the real 3D Bloch Sphere Explorer (components/bloch/components/BlochSphere3D)
// instead of the old flat green wireframe, so the hero preview actually looks
// like the tool it's advertising. BlochSphere3D owns its own <Canvas> and
// OrbitControls internally; the hero wraps this in a pointer-events-none div
// (see HeroSection.tsx), so those controls never receive input here — it's
// purely decorative, driven by a slow simulated precession instead of user drag.
export default function BlochSphereCanvas() {
  const [blochVec, setBlochVec] = useState<BlochVector>({ u: 0.82, v: 0, w: 0.57 });
  const reducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = mediaQuery.matches;
    const handler = (e: MediaQueryListEvent) => { reducedMotion.current = e.matches; };
    mediaQuery.addEventListener('change', handler);

    if (reducedMotion.current) return () => mediaQuery.removeEventListener('change', handler);

    // Precession around the Z axis at a fixed polar angle — visually reads as
    // a qubit spin state slowly sweeping around the sphere, the same physical
    // picture the Explorer teaches.
    let rafId = 0;
    const THETA = (35 * Math.PI) / 180; // polar angle off +Z
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const phi = t * 0.35; // slow sweep
      setBlochVec({
        u: Math.sin(THETA) * Math.cos(phi),
        v: Math.sin(THETA) * Math.sin(phi),
        w: Math.cos(THETA),
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="w-full h-full pointer-events-none absolute inset-0 z-0">
      <BlochSphere3D
        blochVec={blochVec}
        trajectories={[]}
        spinColor="#34d399"
        isDark
        className="opacity-90"
      />
    </div>
  );
}
