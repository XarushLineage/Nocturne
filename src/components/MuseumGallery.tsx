import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PointerLockControls as PointerLockControlsImpl } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { Artist, Artwork } from '../types';
import { makePlacardCanvas } from '../utils/imageHelpers';
import PaintingFrame from './PaintingFrame';

/**
 * First-person walkable gallery for one artist.
 * WASD / arrows to move, mouse-look via pointer lock, touch pad + drag-look
 * on touch devices, Escape releases the pointer, click a painting (or the
 * crosshair while locked) to open the inspect kiosk.
 */

const ROOM = { W: 12.5, D: 15.5, H: 4.3 };
const EYE = 1.62;

interface Slot {
  pos: [number, number, number];
  rotY: number;
}

/** Distribute up to 10 paintings around the room's walls. */
function wallSlots(): Slot[] {
  const { W, D } = ROOM;
  const y = 1.72;
  const back = (x: number): Slot => ({ pos: [x, y, -D / 2 + 0.08], rotY: 0 });
  const left = (z: number): Slot => ({ pos: [-W / 2 + 0.08, y, z], rotY: Math.PI / 2 });
  const right = (z: number): Slot => ({ pos: [W / 2 - 0.08, y, z], rotY: -Math.PI / 2 });
  const front = (x: number): Slot => ({ pos: [x, y, D / 2 - 0.08], rotY: Math.PI });
  return [
    back(-2.7), back(2.7),
    left(-0.6), right(-0.6),
    left(-4.9), right(-4.9),
    left(3.7), right(3.7),
    front(-3.1), front(3.1),
  ];
}

/** Cheap procedural environment map for PBR sheen (no network assets). */
function EnvAndTone({ quality }: { quality: 'high' | 'low' }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = quality === 'high' ? 0.25 : 0.32;
    return () => {
      env.texture.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene, quality]);
  return null;
}

/** WASD + touch movement with simple wall / bench collision. */
function Player({ paused, keysRef }: { paused: boolean; keysRef: React.MutableRefObject<Record<string, boolean>> }) {
  const camera = useThree((s) => s.camera);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useFrame((_, dtRaw) => {
    if (pausedRef.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const k = keysRef.current;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    if (!f && !r) return;
    const speed = k.ShiftLeft || k.ShiftRight ? 4.6 : 2.9;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const move = fwd.multiplyScalar(f).add(side.multiplyScalar(r)).normalize().multiplyScalar(speed * dt);
    const p = camera.position.clone().add(move);
    // walls
    p.x = Math.min(Math.max(p.x, -ROOM.W / 2 + 0.7), ROOM.W / 2 - 0.7);
    p.z = Math.min(Math.max(p.z, -ROOM.D / 2 + 0.7), ROOM.D / 2 - 0.7);
    // benches at (0, ±2.6)
    for (const bz of [-2.6, 2.6]) {
      const hx = 1.25;
      const hz = 0.62;
      if (Math.abs(p.x) < hx && Math.abs(p.z - bz) < hz) {
        const pushX = hx - Math.abs(p.x);
        const pushZ = hz - Math.abs(p.z - bz);
        if (pushX < pushZ) p.x = Math.sign(p.x || 1) * hx;
        else p.z = bz + Math.sign(p.z - bz || 1) * hz;
      }
    }
    p.y = EYE;
    camera.position.copy(p);
  });
  return null;
}

/**
 * Mouse-look via three's PointerLockControls, used directly instead of the
 * drei wrapper: drei's version pins R3F's pointer to screen center while
 * mounted, which silently breaks clicking paintings at the cursor position.
 */
function MouseLook({ onLock, onUnlock }: { onLock(): void; onUnlock(): void }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const controls = new PointerLockControlsImpl(camera, gl.domElement);
    const tryLock = () => {
      if (!document.pointerLockElement) controls.lock();
    };
    gl.domElement.addEventListener('click', tryLock);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);
    return () => {
      gl.domElement.removeEventListener('click', tryLock);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      controls.unlock();
      controls.dispose();
    };
  }, [camera, gl, onLock, onUnlock]);
  return null;
}

/** Crosshair raycast for click-to-inspect while pointer-locked. */
function LockedInspector({
  meshesRef,
  paused,
  onInspect,
}: {
  meshesRef: React.MutableRefObject<THREE.Mesh[]>;
  paused: boolean;
  onInspect(a: Artwork): void;
}) {
  const camera = useThree((s) => s.camera);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const onDown = () => {
      if (!document.pointerLockElement || pausedRef.current) return;
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hit = raycaster.intersectObjects(meshesRef.current, false)[0];
      if (hit && hit.distance < 8.5) {
        document.exitPointerLock();
        onInspect(hit.object.userData.artwork as Artwork);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [camera, meshesRef, onInspect]);
  return null;
}

function Room({ quality, titleTexture }: { quality: 'high' | 'low'; titleTexture: THREE.Texture }) {
  const { W, D, H } = ROOM;
  const wallMat = { color: '#23242b', roughness: 0.94, metalness: 0.02 };
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        {quality === 'high' ? (
          <MeshReflectorMaterial
            blur={[260, 70]}
            resolution={512}
            mixBlur={0.9}
            mixStrength={0.5}
            roughness={0.55}
            depthScale={0.5}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#111217"
            metalness={0.3}
            mirror={0.45}
          />
        ) : (
          <meshStandardMaterial color="#14151a" roughness={0.3} metalness={0.25} envMapIntensity={0.8} />
        )}
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0b0b0f" roughness={1} />
      </mesh>
      {/* walls */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* baseboards */}
      {([
        [0, -D / 2 + 0.03, W, 0],
        [0, D / 2 - 0.03, W, 0],
        [-W / 2 + 0.03, 0, D, Math.PI / 2],
        [W / 2 - 0.03, 0, D, Math.PI / 2],
      ] as const).map(([x, z, len, rot], i) => (
        <mesh key={i} position={[x, 0.07, z]} rotation={[0, rot, 0]}>
          <boxGeometry args={[len, 0.14, 0.04]} />
          <meshStandardMaterial color="#101013" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {/* exhibition title on the back wall */}
      <mesh position={[0, H - 1.0, -D / 2 + 0.05]}>
        <planeGeometry args={[4.6, 1.15]} />
        <meshBasicMaterial map={titleTexture} transparent opacity={0.95} />
      </mesh>
      {/* benches */}
      {[-2.6, 2.6].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.09, 0.55]} />
            <meshStandardMaterial color="#2c2218" roughness={0.45} metalness={0.1} />
          </mesh>
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} position={[x, 0.2, 0]}>
              <boxGeometry args={[0.08, 0.4, 0.45]} />
              <meshStandardMaterial color="#15120c" roughness={0.5} metalness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function MuseumGallery({
  artist,
  works,
  onInspect,
  onReturn,
}: {
  artist: Artist;
  works: Artwork[];
  onInspect(artwork: Artwork): void;
  onReturn(): void;
}) {
  const [quality, setQuality] = useState<'high' | 'low'>(
    () => (localStorage.getItem('nocturne.quality') as 'high' | 'low') ?? 'high',
  );
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const loadedCount = useRef(0);

  const displayed = useMemo(() => works.slice(0, 8), [works]);
  const slots = useMemo(() => wallSlots(), []);
  const imagedCount = useMemo(() => displayed.filter((w) => w.image).length, [displayed]);

  const isTouch = useMemo(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0, []);

  const titleTexture = useMemo(() => {
    const tex = new THREE.CanvasTexture(
      makePlacardCanvas({
        title: artist.name,
        subtitle: `${artist.born} — ${artist.died ?? 'present'}`,
        width: 1640,
        height: 410,
      }),
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [artist]);
  useEffect(() => () => titleTexture.dispose(), [titleTexture]);

  // Ready when the first few textures are in (or after a grace timeout).
  const onTextureLoaded = useCallback(() => {
    loadedCount.current += 1;
    if (loadedCount.current >= Math.min(3, Math.max(imagedCount, 1))) setReady(true);
  }, [imagedCount]);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 6500);
    return () => clearTimeout(t);
  }, []);

  // movement keys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const lockOn = useCallback(() => setLocked(true), []);
  const lockOff = useCallback(() => setLocked(false), []);

  const registerMesh = useCallback((mesh: THREE.Mesh) => {
    if (!meshesRef.current.includes(mesh)) meshesRef.current.push(mesh);
    // QA hook: lets the e2e suite confirm paintings actually mounted.
    (window as unknown as Record<string, unknown>).__nocturnePaintings = meshesRef.current.length;
  }, []);

  const handleInspect = useCallback(
    (artwork: Artwork) => {
      setInspectOpen(true);
      // The click that opened this may simultaneously have engaged pointer
      // lock — release it so the kiosk overlay gets a visible cursor.
      window.setTimeout(() => {
        if (document.pointerLockElement) document.exitPointerLock();
      }, 80);
      onInspect(artwork);
    },
    [onInspect],
  );

  // Re-enable movement when the kiosk closes (App drives the actual overlay).
  useEffect(() => {
    const onResume = () => setInspectOpen(false);
    window.addEventListener('nocturne:inspect-closed', onResume);
    return () => window.removeEventListener('nocturne:inspect-closed', onResume);
  }, []);

  const toggleQuality = () => {
    const next = quality === 'high' ? 'low' : 'high';
    localStorage.setItem('nocturne.quality', next);
    setQuality(next);
  };

  const pad = (code: string, value: boolean) => () => {
    keysRef.current[code] = value;
  };

  // Touch look: one-finger drag rotates the camera (no pointer lock on touch).
  const touchLook = useRef<{ id: number; x: number; y: number } | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && !touchLook.current) {
      touchLook.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    const t = touchLook.current;
    const cam = cameraRef.current;
    if (!t || !cam || e.pointerId !== t.id) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    touchLook.current = { id: t.id, x: e.clientX, y: e.clientY };
    cam.rotation.order = 'YXZ';
    cam.rotation.y -= dx * 0.0042;
    cam.rotation.x = Math.min(Math.max(cam.rotation.x - dy * 0.0042, -1.2), 1.2);
  };
  const onCanvasPointerUp = (e: React.PointerEvent) => {
    if (touchLook.current?.id === e.pointerId) touchLook.current = null;
  };

  return (
    <div className="gallery-root">
      <Canvas
        key={quality}
        shadows={quality === 'high'}
        dpr={quality === 'high' ? [1, 1.75] : 1}
        camera={{ position: [0, EYE, ROOM.D / 2 - 2.0], fov: 68, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          cameraRef.current = state.camera;
          // R3F's default camera looks at the origin, which pitches it down
          // toward the floor — level it out for an eye-height first-person view.
          state.camera.rotation.order = 'YXZ';
          state.camera.rotation.set(0, 0, 0);
          // QA hook for the e2e suite / debugging.
          (window as unknown as Record<string, unknown>).__nocturneScene = state.scene;
          (window as unknown as Record<string, unknown>).__r3fState = state;
        }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        <color attach="background" args={['#070709']} />
        <fog attach="fog" args={['#070709', 14, 34]} />
        <EnvAndTone quality={quality} />

        <hemisphereLight args={['#393a46', '#0b0a0c', 0.55]} />
        <directionalLight
          position={[3.5, 5.5, 2.5]}
          intensity={0.3}
          color="#cdd3e8"
          castShadow={quality === 'high'}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />

        <Room quality={quality} titleTexture={titleTexture} />

        {displayed.map((artwork, i) => (
          <PaintingFrame
            key={`${artwork.qid}-${i}`}
            artwork={artwork}
            position={slots[i].pos}
            rotationY={slots[i].rotY}
            castShadow={quality === 'high' && i < 4}
            register={registerMesh}
            onTextureLoaded={onTextureLoaded}
            onClick={handleInspect}
          />
        ))}

        <Player paused={inspectOpen} keysRef={keysRef} />
        <LockedInspector meshesRef={meshesRef} paused={inspectOpen} onInspect={handleInspect} />
        {!isTouch && !inspectOpen && <MouseLook onLock={lockOn} onUnlock={lockOff} />}
      </Canvas>

      {/* HUD */}
      <button type="button" className="hud-return" onClick={onReturn}>
        ← Return to Timeline
      </button>
      <div className="hud-title">
        <div className="name">{artist.name}</div>
        <div className="sub">
          {imagedCount} of {displayed.length} works shown · Wikimedia Commons
        </div>
      </div>
      <div className={`hud-hint ${locked ? 'dim' : ''}`}>
        {isTouch
          ? 'Drag to look · use the pad to walk · tap a painting to inspect'
          : 'Click to look around · WASD to walk · click a painting to inspect · ESC to release'}
      </div>
      <button type="button" className="hud-quality" onClick={toggleQuality}>
        Quality · {quality}
      </button>
      {locked && <div className="crosshair" />}

      {isTouch && (
        <div className="touch-pad">
          <button type="button" className="tp-fwd" onPointerDown={pad('KeyW', true)} onPointerUp={pad('KeyW', false)} onPointerLeave={pad('KeyW', false)}>▲</button>
          <button type="button" className="tp-left" onPointerDown={pad('KeyA', true)} onPointerUp={pad('KeyA', false)} onPointerLeave={pad('KeyA', false)}>◀</button>
          <button type="button" className="tp-back" onPointerDown={pad('KeyS', true)} onPointerUp={pad('KeyS', false)} onPointerLeave={pad('KeyS', false)}>▼</button>
          <button type="button" className="tp-right" onPointerDown={pad('KeyD', true)} onPointerUp={pad('KeyD', false)} onPointerLeave={pad('KeyD', false)}>▶</button>
        </div>
      )}

      <div className={`gallery-loading ${ready ? 'done' : ''}`}>
        <div className="room-name">{artist.name}</div>
        <div className="loading-line" style={{ position: 'relative', opacity: 1, width: 220, height: 1, background: 'rgba(216,184,106,0.15)', overflow: 'hidden' }}>
          <span
            style={{
              position: 'absolute', left: 0, top: 0, width: '40%', height: '100%',
              background: '#d8b86a', animation: 'linesweep 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
