import { Suspense, useRef, useState, useEffect, useCallback, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RotateCcw, Maximize, Pause, Play } from 'lucide-react';

/* ── Error Boundary to prevent white-screen crashes ── */
class ViewerErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('3D Viewer error:', error); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full flex items-center justify-center bg-black/90 text-white/60 text-sm" style={{ aspectRatio: '3/4' }}>
          3D viewer failed to load
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Panoramic Sphere for standard images (jpg/png) ── */
const PanoramaSphereImage = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

/* ── Panoramic Sphere for EXR files ── */
const PanoramaSphereEXR = ({ url }: { url: string }) => {
  const texture = useLoader(EXRLoader as any, url) as THREE.DataTexture;
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
  }, [texture]);
  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
};

/* ── Panorama dispatcher ── */
const PanoramaSphere = ({ url }: { url: string }) => {
  const isEXR = url.toLowerCase().endsWith('.exr');
  return isEXR ? <PanoramaSphereEXR url={url} /> : <PanoramaSphereImage url={url} />;
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
  return (
    <OrbitControls
      autoRotate={autoRotate}
      autoRotateSpeed={1.2}
      enableDamping
      dampingFactor={0.05}
      enablePan={false}
      minDistance={1}
      maxDistance={10}
      onStart={onInteraction}
      enableZoom
      zoomSpeed={0.5}
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
    <ViewerErrorBoundary>
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
            <ambientLight intensity={2.5} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight position={[-5, -3, 3]} intensity={1.0} />
            <directionalLight position={[0, -4, 4]} intensity={0.8} />
            <directionalLight position={[0, 5, -3]} intensity={0.6} />
            <hemisphereLight args={['#ffffff', '#cccccc', 1.5]} />

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
    </ViewerErrorBoundary>
  );
};

export default ProductViewer3D;