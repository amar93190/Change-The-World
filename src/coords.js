import * as THREE from 'three';

/**
 * Convertit lat/lon (degrés) en position 3D sur une sphère de rayon donné.
 * Une seule source de vérité : utilisée pour les points du globe ET pour les
 * marqueurs de crise, ce qui garantit qu'ils tombent sur les bons continents.
 */
export function latLonToVector3(lat, lon, radius) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lonRad);
  return new THREE.Vector3(x, y, z);
}

/** UV équirectangulaire correspondant à une lat/lon, aligné sur latLonToVector3. */
export function latLonToUV(lat, lon) {
  const u = (lon + 180) / 360;
  const v = (lat + 90) / 180; // 0 = pôle sud, 1 = pôle nord
  return { u, v };
}
