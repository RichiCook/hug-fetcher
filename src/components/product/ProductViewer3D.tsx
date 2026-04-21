import { useRef, useState, useEffect, useCallback, Component, ReactNode } from 'react';
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
const Model = ({ url, onLoaded }: { url: string; onLoaded?: () => void }) => {
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
    onLoaded?.();
  }, [scene, onLoaded]);

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
      onStart={onInteraction}
      enableZoom
      zoomSpeed={0.6}
      minDistance={2.5}
      maxDistance={6}
      target={[0, 0, 0]}
      makeDefault
    />
  );
};

/* ── Main Component ── */
interface ProductViewer3DProps {
  modelUrl: string;
  panoramaUrl?: string | null;
  fallbackImageUrl?: string | null;
}

const ProductViewer3D = ({ modelUrl, panoramaUrl, fallbackImageUrl }: ProductViewer3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [modelReady, setModelReady] = useState(false);
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
        className="relative w-full bg-white"
        style={{ aspectRatio: '3/4' }}
      >
        {/* Fallback image overlay until 3D model is ready */}
        {!modelReady && fallbackImageUrl && (
          <div className="absolute inset-0 z-20 bg-white">
            <img
              src={fallbackImageUrl}
              alt="Product preview"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Transparent overlay edges that allow scroll-through */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Top strip */}
          <div className="absolute top-0 left-0 right-0 h-[20%] pointer-events-auto" style={{ touchAction: 'pan-y' }} />
          {/* Bottom strip */}
          <div className="absolute bottom-0 left-0 right-0 h-[20%] pointer-events-auto" style={{ touchAction: 'pan-y' }} />
          {/* Left strip */}
          <div className="absolute top-[20%] left-0 w-[15%] bottom-[20%] pointer-events-auto" style={{ touchAction: 'pan-y' }} />
          {/* Right strip */}
          <div className="absolute top-[20%] right-0 w-[15%] bottom-[20%] pointer-events-auto" style={{ touchAction: 'pan-y' }} />
        </div>

        <Canvas
          camera={{ position: [-4, 0.5, 0], fov: 50 }}
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => gl.setClearColor('#ffffff', 1)}
        >
            <ambientLight intensity={4} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <directionalLight position={[-5, -3, 3]} intensity={1.5} />
            <directionalLight position={[0, -4, 4]} intensity={1.0} />
            <directionalLight position={[0, 5, -3]} intensity={0.8} />
            <directionalLight position={[8, 0, 2]} intensity={2.0} />
            <directionalLight position={[-8, 0, 2]} intensity={2.0} />
            <directionalLight position={[4, 0, -5]} intensity={1.5} />
            <directionalLight position={[-4, 0, -5]} intensity={1.5} />
            <hemisphereLight args={['#ffffff', '#e0e0e0', 2.0]} />

            {panoramaUrl && <PanoramaSphere url={panoramaUrl} />}

            <Model url={modelUrl} onLoaded={() => setModelReady(true)} />

            <SceneControls
              autoRotate={autoRotate}
              onInteraction={handleInteraction}
            />
        </Canvas>

      </div>
    </ViewerErrorBoundary>
  );
};

export default ProductViewer3D;