import * as THREE from 'three';

/**
 * Champ d'étoiles + fines particules "constellation" en arrière-plan.
 * Retourne un objet avec le groupe à ajouter à la scène et une fonction update().
 */
export function createBackground() {
  const group = new THREE.Group();

  // --- Étoiles lointaines ---
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  const starSize = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    // distribution sur une grande sphère
    const r = 60 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    starSize[i] = Math.random() * 1.6 + 0.3;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uTime;
      varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vTw = 0.6 + 0.4 * sin(uTime * 0.8 + position.x * 0.3 + position.y * 0.2);
        gl_PointSize = aSize * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vTw;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vTw;
        gl_FragColor = vec4(0.75, 0.83, 1.0, a);
      }
    `
  });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  // --- Fines lignes "constellation" ---
  const nodeCount = 26;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const r = 26 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    nodes.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
    );
  }
  const linePts = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 16) {
        linePts.push(nodes[i], nodes[j]);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4a6ba8,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const constellation = new THREE.LineSegments(lineGeo, lineMat);
  group.add(constellation);

  function update(t) {
    starMat.uniforms.uTime.value = t;
    group.rotation.y = t * 0.01;
    constellation.rotation.z = t * 0.006;
  }

  return { group, update };
}
