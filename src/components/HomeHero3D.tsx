import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createStage, type Stage } from '../engine/createStage';
import { loadAnatomy } from '../engine/loadAnatomy';
import { applyFresnelRim } from '../engine/fresnelXray';

/**
 * Home-page hero: the real BodyParts3D bronchial tree from M8 (trachea to segmental bronchi), with
 * the aorta and pulmonary vessels around it, turning slowly. Decorative: no clinical information,
 * no controls (so it never captures page scrolling). Stops when the home page is left; static when
 * the user prefers reduced motion; does not render while scrolled out of view.
 */
export function HomeHero3D({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let stage: Stage | null = null;
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    createStage({
      container,
      background: '#05070a',
      fov: 30,
      near: 0.005,
      far: 5,
      home: { position: [0.0, -0.035, 0.42], target: [0.004, -0.05, -0.012] },
      controls: false,
      bloom: { strength: 0.22, radius: 0.5, threshold: 0.85 },
      envIntensity: 0.65,
    })
      .then(async (s) => {
        if (cancelled) {
          s.dispose();
          return;
        }
        stage = s;
        // Let the page scroll over the canvas on phones.
        const canvas = container.querySelector('canvas');
        if (canvas) canvas.style.touchAction = 'pan-y';

        const anatomy = await loadAnatomy('airway.glb');
        if (cancelled) return;

        const airway = s.materials.clone('mucosa');
        Object.assign(airway, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
        airway.color.set(0xf0aaa6);
        applyFresnelRim(airway, { power: 2.4, rimAlpha: 0.75, rimColor: 0xffe1dc, strength: 1 });
        const artery = s.materials.clone('artery');
        const vein = s.materials.clone('vein');
        for (const m of [artery, vein]) {
          Object.assign(m, { transparent: true, opacity: 0.22, depthWrite: false });
          applyFresnelRim(m, { power: 2.8, rimAlpha: 0.4, strength: 1 });
        }

        const meshes: THREE.Mesh[] = [];
        anatomy.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
        });
        for (const m of meshes) {
          (m.material as THREE.Material).dispose();
          const n = m.name;
          if (n.startsWith('ctx_')) {
            const isArtery = /aort/i.test(n);
            const isPulm = /PA|pulmonary/i.test(n);
            if (!isArtery && !isPulm) {
              m.visible = false; // no muscle shell: keep the tree readable
              m.material = airway;
              continue;
            }
            m.material = isArtery ? artery : vein;
            m.renderOrder = 1;
          } else {
            m.material = airway;
            m.renderOrder = 2;
          }
        }

        // Centre the tree on the pivot so it turns about its own axis.
        const pivot = new THREE.Group();
        const box = new THREE.Box3().setFromObject(anatomy);
        const centre = box.getCenter(new THREE.Vector3());
        anatomy.position.sub(centre);
        pivot.position.copy(centre);
        pivot.add(anatomy);
        s.scene.add(pivot);
        s.camera.lookAt(centre);

        let visible = true;
        io = new IntersectionObserver((e) => {
          visible = e[0]?.isIntersecting ?? true;
        });
        io.observe(container);
        pivot.rotation.y = -0.5;
        s.onFrame(({ dt }) => {
          if (reduce || !visible) return;
          pivot.rotation.y += dt * 0.18;
        });
        setReady(true);
      })
      .catch(() => {
        /* WebGL unavailable: the gradient placeholder stays. */
      });

    return () => {
      cancelled = true;
      io?.disconnect();
      stage?.dispose();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`absolute inset-0 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
