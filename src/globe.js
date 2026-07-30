import * as THREE from 'three';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-50m.json';
import { latLonToVector3 } from './coords.js';

const RADIUS = 5;

export function createGlobe() {
  const group = new THREE.Group();
  group.add(buildOcean());

  const countries = feature(worldTopo, worldTopo.objects.countries);
  const { linesGroup, highlight, resetHighlight } = buildCountryLines(countries);
  group.add(linesGroup);
  group.add(buildGraticule());
  group.add(buildAtmosphere());

  return { group, update() {}, radius: RADIUS, highlight, resetHighlight };
}

function ringToSegments(ring, r) {
  const pts = ring.map(([lon, lat]) => latLonToVector3(lat, lon, r));
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    out.push(pts[i]);
    out.push(pts[(i + 1) % pts.length]);
  }
  return out;
}

function buildCountryLines(countries) {
  const group     = new THREE.Group();
  const r         = RADIUS * 1.0015;
  const rH        = RADIUS * 1.004; // highlight layer sits slightly above

  const allVerts  = [];
  const countryPts = new Map(); // numericId → THREE.Vector3[]

  for (const f of countries.features) {
    if (!f.geometry) continue;
    const id   = Number(f.id);
    const poly = f.geometry.type === 'Polygon'
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;

    const pts = [];
    for (const p of poly) {
      for (const ring of p) {
        const segs = ringToSegments(ring, r);
        allVerts.push(...segs);
        // Store elevated copy for highlight layer
        for (const v of segs) pts.push(v.clone().multiplyScalar(rH / r));
      }
    }
    countryPts.set(id, pts);
  }

  const geo = new THREE.BufferGeometry().setFromPoints(allVerts);

  const haloMat = new THREE.LineBasicMaterial({
    color: 0x0af5ff, transparent: true, opacity: 0.07,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const coreMat = new THREE.LineBasicMaterial({
    color: 0xaaf8ff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  group.add(new THREE.LineSegments(geo, haloMat));
  group.add(new THREE.LineSegments(geo, coreMat));

  let hlMesh = null;

  function highlight(ids = []) {
    haloMat.opacity = 0.025;
    coreMat.opacity = 0.18;

    if (hlMesh) { group.remove(hlMesh); hlMesh.geometry.dispose(); hlMesh.material.dispose(); hlMesh = null; }

    const pts = [];
    for (const id of ids) {
      const p = countryPts.get(id);
      if (p) pts.push(...p);
    }
    if (!pts.length) return;

    hlMesh = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    group.add(hlMesh);
  }

  function resetHighlight() {
    haloMat.opacity = 0.07;
    coreMat.opacity = 0.9;
    if (hlMesh) { group.remove(hlMesh); hlMesh.geometry.dispose(); hlMesh.material.dispose(); hlMesh = null; }
  }

  return { linesGroup: group, highlight, resetHighlight };
}

function buildOcean() {
  // Gradient shader: dark center → slightly lighter rim = sensation de profondeur
  return new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 0.998, 72, 72),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        varying vec3 vNorm;
        void main() {
          vNorm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vNorm;
        void main() {
          float d = clamp(dot(vNorm, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
          // Centre : bleu très sombre. Bord : légèrement plus clair / teinté teal.
          vec3 deep  = vec3(0.005, 0.018, 0.065);
          vec3 rim   = vec3(0.010, 0.045, 0.130);
          gl_FragColor = vec4(mix(rim, deep, pow(d, 0.6)), 1.0);
        }
      `,
    })
  );
}

function buildGraticule() {
  const group = new THREE.Group();
  const r     = RADIUS * 1.0005;
  const mat   = new THREE.LineBasicMaterial({
    color: 0x0d2540, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const matEq = new THREE.LineBasicMaterial({
    color: 0x163860, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVector3(lat, lon, r));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? matEq : mat));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVector3(lat, lon, r));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  return group;
}

function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide,
    depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vNormal;
      void main() {
        float d   = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float rim = pow(1.0 - d, 4.2);
        vec3  col = mix(vec3(0.04, 0.30, 0.90), vec3(0.15, 0.72, 1.0), rim);
        gl_FragColor = vec4(col * rim * 0.85, rim * 0.62);
      }
    `,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.18, 72, 72), mat);
}
