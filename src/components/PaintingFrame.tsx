import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { Artwork } from '../types';
import { makePlacardCanvas } from '../utils/imageHelpers';

/**
 * A framed painting on a gallery wall: dark outer moulding, gold fillet,
 * lazily-loaded canvas texture, a warm dedicated spotlight, and a small
 * placard. Works without a freely-licensed image render as an elegant
 * "image unavailable — rights restricted" placard instead (never a fake).
 */

interface Props {
  artwork: Artwork;
  position: [number, number, number];
  rotationY: number;
  castShadow: boolean;
  register(mesh: THREE.Mesh): void;
  onTextureLoaded(): void;
  /** Direct (non-pointer-locked) click/tap on the canvas — touch & kiosk path. */
  onClick(artwork: Artwork): void;
}

/** Size the canvas from the real image aspect ratio, normalized by area. */
function paintingSize(artwork: Artwork): [number, number] {
  const aspect = artwork.image ? artwork.image.width / artwork.image.height : 0.78;
  let w = Math.sqrt(2.1 * aspect);
  let h = w / aspect;
  const maxDim = Math.max(w, h);
  if (maxDim > 2.05) {
    w *= 2.05 / maxDim;
    h *= 2.05 / maxDim;
  }
  if (h < 0.8) {
    w *= 0.8 / h;
    h = 0.8;
  }
  return [w, h];
}

export default function PaintingFrame({ artwork, position, rotationY, castShadow, register, onTextureLoaded, onClick }: Props) {
  const gl = useThree((s) => s.gl);
  const meshRef = useRef<THREE.Mesh>(null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [w, h] = useMemo(() => paintingSize(artwork), [artwork]);

  // Lazy texture: either the Commons image or a generated placard.
  useEffect(() => {
    let disposed = false;
    let tex: THREE.Texture;
    if (artwork.image) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        artwork.image.thumb,
        (loaded) => {
          if (disposed) {
            loaded.dispose();
            return;
          }
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
          setTexture(loaded);
          onTextureLoaded();
        },
        undefined,
        () => {
          // Network failure: degrade to a sourced placard, never a blank wall.
          if (disposed) return;
          const placard = new THREE.CanvasTexture(
            makePlacardCanvas({ title: artwork.title, subtitle: artwork.year ? String(artwork.year) : undefined, note: 'Image could not be loaded.' }),
          );
          placard.colorSpace = THREE.SRGBColorSpace;
          setTexture(placard);
          onTextureLoaded();
        },
      );
    } else {
      tex = new THREE.CanvasTexture(
        makePlacardCanvas({
          title: artwork.title,
          subtitle: artwork.year ? String(artwork.year) : undefined,
          note: 'Image unavailable — rights restricted. Verified metadata only.',
          width: 820,
          height: 1024,
        }),
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
      onTextureLoaded();
    }
    return () => {
      disposed = true;
    };
  }, [artwork, gl, onTextureLoaded]);

  useEffect(() => () => texture?.dispose(), [texture]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.userData.artwork = artwork;
      register(mesh);
    }
  }, [artwork, register]);

  const plaque = useMemo(() => {
    const tex = new THREE.CanvasTexture(
      makePlacardCanvas({
        title: artwork.title,
        subtitle: artwork.year ? String(artwork.year) : 'date unknown',
        width: 640,
        height: 320,
      }),
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [artwork]);
  useEffect(() => () => plaque.dispose(), [plaque]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* outer moulding */}
      <mesh position={[0, 0, 0.03]} castShadow={castShadow}>
        <boxGeometry args={[w + 0.2, h + 0.2, 0.06]} />
        <meshStandardMaterial color="#241c12" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* gold fillet */}
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.05]} />
        <meshStandardMaterial color="#9a7b42" roughness={0.3} metalness={0.85} envMapIntensity={1.2} />
      </mesh>
      {/* the canvas itself (raycast target) */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0.078]}
        onClick={(e) => {
          e.stopPropagation();
          if (!document.pointerLockElement) onClick(artwork);
        }}
      >
        <planeGeometry args={[w, h]} />
        {texture ? (
          // color must be explicit white: R3F reuses the placeholder material
          // instance, and a leftover dark color would multiply the texture.
          <meshStandardMaterial map={texture} color="#ffffff" roughness={0.85} metalness={0} />
        ) : (
          <meshStandardMaterial color="#191a21" roughness={0.95} />
        )}
      </mesh>
      {/* subtle glass glare */}
      <mesh position={[0, 0, 0.082]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.045}
          roughness={0.06}
          metalness={1}
          envMapIntensity={1.6}
          depthWrite={false}
        />
      </mesh>

      {/* warm spot washing the painting */}
      <primitive object={lightTarget} position={[0, 0, 0.1]} />
      <spotLight
        position={[0, h / 2 + 1.35, 1.45]}
        target={lightTarget}
        intensity={26}
        distance={9}
        angle={0.62}
        penumbra={0.75}
        decay={2}
        color="#ffdcae"
        castShadow={false}
      />

      {/* wall placard beside the painting */}
      <mesh position={[w / 2 + 0.42, -h * 0.12, 0.02]}>
        <planeGeometry args={[0.46, 0.23]} />
        <meshStandardMaterial map={plaque} roughness={0.7} />
      </mesh>
    </group>
  );
}
