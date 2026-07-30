import * as THREE from 'three';
import { latLonToVector3 } from './coords.js';

// Paires de crises reliées thématiquement ou géographiquement
const CONNECTIONS = [
  ['soudan',           'soudan-sud'],       // voisins, histoire commune
  ['soudan',           'ethiopie-tigre'],   // flux de réfugiés
  ['soudan',           'libye'],            // route migratoire
  ['rdc-est',          'rca'],              // instabilité régionale
  ['rdc-est',          'soudan-sud'],       // zone de fragilité commune
  ['sahel',            'nigeria-ne'],       // réseaux jihadistes
  ['sahel',            'rca'],             // Wagner + jihadisme
  ['nigeria-ne',       'cameroun'],         // Boko Haram / lac Tchad
  ['venezuela',        'colombie'],         // exode vénézuélien
  ['yemen',            'somalie'],          // golfe d'Aden
  ['palestine-israel', 'syrie'],            // conflit régional
  ['myanmar-rohingyas','afghanistan'],      // crises islamophobes / minorités
  ['libye',            'sahel'],            // route de migration / armes
  ['somalie',          'ethiopie-tigre'],   // corne de l'Afrique
];

export function createArcs(crises, radius) {
  const group    = new THREE.Group();
  const arcItems = [];
  const byId     = new Map(crises.map((c) => [c.id, c]));

  for (const [idA, idB] of CONNECTIONS) {
    const a = byId.get(idA);
    const b = byId.get(idB);
    if (!a || !b) continue;

    const posA = latLonToVector3(a.lat, a.lon, radius);
    const posB = latLonToVector3(b.lat, b.lon, radius);

    // Hauteur de l'arc proportionnelle à la distance entre les deux crises
    const dist       = posA.distanceTo(posB);
    const elevFactor = 1.22 + (dist / (radius * 2)) * 0.55;
    const mid        = posA.clone().add(posB).normalize().multiplyScalar(radius * elevFactor);

    const curve  = new THREE.CatmullRomCurve3([posA, mid, posB]);
    const pts    = curve.getPoints(100);

    // Attribut de progression (0 → 1 le long de l'arc)
    const progress = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) progress[i] = i / (pts.length - 1);

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      uniforms: {
        uTime:  { value: 0 },
        uColor: { value: new THREE.Color(0x3a8fff) },
        uPhase: { value: Math.random() },
      },
      vertexShader: /* glsl */`
        attribute float aProgress;
        varying  float vProgress;
        void main() {
          vProgress   = aProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3  uColor;
        uniform float uPhase;
        varying float vProgress;

        void main() {
          // Filet persistant très tenu
          float base = 0.07;

          // Pulse lumineux qui voyage de 0 à 1 en continu
          float speed = 0.10;
          float t     = fract(uTime * speed + uPhase);

          // Distance au pulse (gestion du wrap)
          float diff  = vProgress - t;
          if (diff >  0.5) diff -= 1.0;
          if (diff < -0.5) diff += 1.0;

          float pulse = exp(-diff * diff * 260.0);

          float brightness = base + pulse * 1.4;
          float alpha      = base * 0.4 + pulse * 0.85;

          gl_FragColor = vec4(uColor * brightness, alpha);
        }
      `,
    });

    const line = new THREE.Line(geo, mat);
    group.add(line);
    arcItems.push({ mat });
  }

  function update(t) {
    for (const arc of arcItems) arc.mat.uniforms.uTime.value = t;
  }

  return { group, update };
}
