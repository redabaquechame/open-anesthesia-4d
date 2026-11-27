import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export interface AnatomyLabel {
  group: THREE.Group;
  setText(text: string, sub?: string): void;
  setVisible(v: boolean): void;
  setHighlight(on: boolean): void;
}

/**
 * Crisp HTML label with a leader line from an anchor point on the structure to the label.
 * Text stays sharp at any zoom because it is DOM text, not a texture.
 */
export function createLabel(opts: {
  anchor: THREE.Vector3;
  offset: THREE.Vector3;
  text: string;
  sub?: string;
  color?: string;
  /** Anchor dot radius in scene units. Default: 4% of the leader-line length (works at any scene scale). */
  dotRadius?: number;
}): AnatomyLabel {
  const color = opts.color ?? '#e2e8f0';
  const group = new THREE.Group();

  const el = document.createElement('div');
  el.style.cssText = [
    'font: 600 11px/1.25 Inter, system-ui, sans-serif',
    'color: #f8fafc',
    'background: rgba(2, 6, 23, 0.82)',
    `border: 1px solid ${color}`,
    'border-radius: 6px',
    'padding: 3px 7px',
    'white-space: nowrap',
    'pointer-events: none',
    'box-shadow: 0 2px 10px rgba(0,0,0,0.45)',
    'transition: transform 120ms ease, background 120ms ease',
  ].join(';');
  const title = document.createElement('div');
  const subEl = document.createElement('div');
  subEl.style.cssText = 'font-weight: 400; font-size: 10px; color: #94a3b8';
  el.append(title, subEl);

  const label = new CSS2DObject(el);
  label.position.copy(opts.anchor).add(opts.offset);
  group.add(label);

  const dotMat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true });
  const dotRadius = opts.dotRadius ?? Math.max(1e-4, opts.offset.length() * 0.04);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(dotRadius, 10, 8), dotMat);
  dot.position.copy(opts.anchor);
  dot.renderOrder = 10;
  group.add(dot);

  const lineGeo = new THREE.BufferGeometry().setFromPoints([opts.anchor, label.position.clone()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, depthTest: false }));
  line.renderOrder = 10;
  group.add(line);

  const setText = (text: string, sub?: string) => {
    title.textContent = text;
    subEl.textContent = sub ?? '';
    subEl.style.display = sub ? 'block' : 'none';
  };
  setText(opts.text, opts.sub);

  return {
    group,
    setText,
    setVisible(v) {
      group.visible = v;
      label.visible = v;
    },
    setHighlight(on) {
      el.style.background = on ? 'rgba(8, 47, 73, 0.95)' : 'rgba(2, 6, 23, 0.82)';
      el.style.transform = on ? 'scale(1.08)' : '';
    },
  };
}
