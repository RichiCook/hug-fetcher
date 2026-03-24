import { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, Maximize, Pause, Play } from 'lucide-react';

/* ── Panoramic Sphere (360° background) ── */
const PanoramaSphere = ({ url }: { url: string }) => {
  const texture = new THREE.TextureLoader().load(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

/* ── Auto-scaled GLB Model ── */
const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    scene.scale.setScalar(scale);
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [scene]);

  return <primitive ref={ref} object={scene} />;
};

/* ── Controls wrapper with idle auto-rotate ── */
const SceneControls = ({
  autoRotate,
  onInteraction,
}: {
  autoRotate: boolean;
  onInteraction: () => void;
}) => {
  const controlsRef = useRef<any>(null);

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={autoRotate}
      autoRotateSpeed={1.2}
      enableDamping
      dampingFactor={0.05}
      enablePan={false}
      minDistance={1}
      maxDistance={10}
      onStart={onInteraction}
      enableZoom
      touchZoomSpeed={0.5}
    />
  );
};

/* ── Loading Spinner ── */
const Loader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
    <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

/* ── Main Component ── */
interface ProductViewer3DProps {
  modelUrl: string;
  panoramaUrl?: string | null;
}

const ProductViewer3D = ({ modelUrl, panoramaUrl }: ProductViewer3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleInteraction = useCallback(() => {
    setAutoRotate(false);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setAutoRotate(true), 3000);
  }, []);

  const handleReset = () => {
    // Force re-mount canvas by toggling key — simple approach
    setAutoRotate(true);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  };

  useEffect(() => {
    return () => clearTimeout(idleTimerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ aspectRatio: '3/4' }}
    >
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: false }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-3, -3, 2]} intensity={0.3} />

          {panoramaUrl && <PanoramaSphere url={panoramaUrl} />}

          <Model url={modelUrl} />

          <SceneControls
            autoRotate={autoRotate}
            onInteraction={handleInteraction}
          />
        </Canvas>
      </Suspense>

      {/* Floating controls — glassmorphism */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <button
          onClick={handleReset}
          className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAutoRotate(prev => !prev)}
          className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
          title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
        >
          {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
          title="Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ProductViewer3D;
