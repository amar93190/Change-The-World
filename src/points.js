import * as THREE from 'three';
import { latLonToVector3 } from './coords.js';

const COLORS = {
  major: new THREE.Color(0xff5a3c),
  watch: new THREE.Color(0x35d0e0),
};

const SHAFT_GEO = new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6, 1);
const HEAD_GEO  = new THREE.SphereGeometry(0.05, 10, 10);
const BEAM_GEO  = new THREE.CylinderGeometry(0.001, 0.022, 1.6, 6, 1, true);
const RING_GEO  = new THREE.TorusGeometry(0.18, 0.013, 6, 48);
const HIT_GEO   = new THREE.SphereGeometry(0.28, 6, 6);
const HEAT_TEX  = buildHeatTexture();

function buildHeatTexture() {
  const size = 128;
  const c    = document.createElement('canvas');
  c.width = c.height = size;
  const ctx  = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function createCrisisPoints(crises, radius) {
  const group   = new THREE.Group();
  const markers = [];
  const hitList = [];

  crises.forEach((crisis) => {
    const color = COLORS[crisis.severity] || COLORS.watch;
    const pos   = latLonToVector3(crisis.lat, crisis.lon, radius * 1.003);

    // ── Zone de chaleur (Sprite, toujours face caméra) ────────────────
    const heatMat = new THREE.SpriteMaterial({
      map: HEAT_TEX,
      color: color.clone(),
      transparent: true,
      opacity: crisis.severity === 'major' ? 0.38 : 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const heat = new THREE.Sprite(heatMat);
    const heatScale = crisis.severity === 'major' ? 1.5 : 1.0;
    heat.scale.setScalar(heatScale);
    heat.position.copy(latLonToVector3(crisis.lat, crisis.lon, radius * 1.001));
    group.add(heat);

    // ── Container orienté vers l'extérieur du globe ───────────────────
    const container = new THREE.Group();
    container.position.copy(pos);
    const outward = pos.clone().normalize();
    container.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);

    // Tige
    const shaft = new THREE.Mesh(
      SHAFT_GEO,
      new THREE.MeshBasicMaterial({
        color: color.clone().multiplyScalar(0.6),
        transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    shaft.position.y = 0.21;
    container.add(shaft);

    // Tête
    const head = new THREE.Mesh(
      HEAD_GEO,
      new THREE.MeshBasicMaterial({
        color: color.clone(),
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    head.position.y = 0.47;
    container.add(head);

    // Faisceau lumineux
    const beam = new THREE.Mesh(
      BEAM_GEO,
      new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      })
    );
    beam.position.y = 0.47 + 0.8;
    beam.rotation.x = Math.PI;
    container.add(beam);

    // Anneau radar
    const ring = new THREE.Mesh(
      RING_GEO,
      new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    container.add(ring);

    // Zone de clic
    const hit = new THREE.Mesh(
      HIT_GEO,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false })
    );
    hit.position.y = 0.47;
    hit.userData.crisis = crisis;
    container.add(hit);
    hitList.push(hit);

    group.add(container);
    markers.push({
      crisis, container, head, beam, ring, shaft, heat, heatMat,
      phase: markers.length * 0.9,
      color,
      baseHeatScale: heatScale,
      baseHeatOpacity: heatMat.opacity,
    });
  });

  function update(t) {
    for (const m of markers) {
      // Anneau radar
      const cycle = ((t * 0.5 + m.phase) % 2) / 2;
      m.ring.scale.setScalar(0.8 + cycle * 3.5);
      m.ring.material.opacity = (1 - cycle) * 0.55;

      // Tête — respiration
      const breathe = 1 + 0.12 * Math.sin(t * 1.6 + m.phase);
      m.head.scale.setScalar(breathe);

      // Faisceau — vacillement
      m.beam.material.opacity = 0.16 + 0.1 * Math.sin(t * 2.2 + m.phase);

      // Zone de chaleur — pulsation lente
      const heatPulse = 1 + 0.08 * Math.sin(t * 0.9 + m.phase * 1.3);
      m.heat.scale.setScalar(m.baseHeatScale * heatPulse);
      m.heatMat.opacity = m.baseHeatOpacity * (0.9 + 0.1 * Math.sin(t * 1.1 + m.phase));
    }
  }

  function setActive(crisisId) {
    for (const m of markers) {
      const on = m.crisis.id === crisisId;
      m.head.material.color.set(on ? 0xffffff : m.color);
      m.head.scale.setScalar(on ? 1.5 : 1);
      m.beam.material.opacity = on ? 0.45 : 0.22;
      // Chaleur boostée sur la crise sélectionnée
      m.baseHeatScale   = on ? (m.crisis.severity === 'major' ? 2.2 : 1.5) : (m.crisis.severity === 'major' ? 1.5 : 1.0);
      m.baseHeatOpacity = on ? 0.55 : (m.crisis.severity === 'major' ? 0.38 : 0.25);
    }
  }

  function resetActive() {
    for (const m of markers) {
      m.head.material.color.copy(m.color);
      m.head.scale.setScalar(1);
      m.beam.material.opacity = 0.22;
      m.baseHeatScale   = m.crisis.severity === 'major' ? 1.5 : 1.0;
      m.baseHeatOpacity = m.crisis.severity === 'major' ? 0.38 : 0.25;
    }
  }

  return { group, update, markers, hitList, setActive, resetActive };
}
