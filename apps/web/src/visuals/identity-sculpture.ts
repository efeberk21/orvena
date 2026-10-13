import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { fingerprintCanvas, keyhole, renderFingerprint, ridgeArea } from './fingerprint-pattern';
import { stage } from './story-timeline';

export type Sculpture = { pose: (progress: number, x: number, y: number) => void; resize: () => void; dispose: () => void };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const backOut = (v: number) => { const t = clamp(v) - 1, c = 2.2; return 1 + (c + 1) * t * t * t + c * t * t; };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function keyholePath() {
  const path = new THREE.Path();
  path.absarc(0, keyhole.centerY, keyhole.radius, Math.PI * 4 / 3, -Math.PI / 3, true);
  path.lineTo(keyhole.footX, keyhole.bottomY + 0.045);
  path.quadraticCurveTo(keyhole.footX + 0.006, keyhole.bottomY, keyhole.footX - 0.04, keyhole.bottomY);
  path.lineTo(-keyhole.footX + 0.04, keyhole.bottomY);
  path.quadraticCurveTo(-keyhole.footX - 0.006, keyhole.bottomY, -keyhole.footX, keyhole.bottomY + 0.045);
  path.lineTo(-keyhole.shoulderX, keyhole.shoulderY);
  path.closePath();
  return path;
}

// Padlock body dimensions (plate space, y up, z towards the viewer).
const BODY = { width: 2.55, height: 3.38, radius: 1.18, depth: 0.6, bevel: 0.07, front: 0.1 };
const BODY_MID_Z = BODY.front - BODY.bevel - BODY.depth / 2;
const SHACKLE = { x: 0.62, top: 2.02, radius: 0.12, longEnd: 0.95, shortEnd: 1.42, lift: 0.46, swing: 1.8 };
const KEY_SEAT_Z = -0.36; // key tip when fully inserted, well behind the front face
const KEY_TRAVEL = 1.15;

/** Sculptural padlock with a procedurally generated whorl – artwork only, never user biometrics. */
export function createIdentitySculpture(host: HTMLElement): Sculpture {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
  camera.position.set(0, 0, 10.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffecd6, 0x251c14, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff0df, 4.6);
  keyLight.position.set(-3, 5, 4); scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xd9955c, 4);
  rim.position.set(4, -1, 2); scene.add(rim);
  const fill = new THREE.PointLight(0xe8b37d, 18);
  fill.position.set(-2, -2, 3); scene.add(fill);

  const materials: THREE.Material[] = [];
  const track = <T extends THREE.Material>(material: T) => { materials.push(material); return material; };
  const faceMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0x30251c, metalness: 0.5, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true }));
  const metalMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xd6ae87, metalness: 0.92, roughness: 0.2, clearcoat: 0.6, transparent: true }));
  const ridgeMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xdbb58e, metalness: 0.62, roughness: 0.28, clearcoat: 0.8, transparent: true, alphaTest: 0.5 }));
  const cavityMaterial = track(new THREE.MeshStandardMaterial({ color: 0x100c08, roughness: 0.9, emissive: 0xdf985a, emissiveIntensity: 0, transparent: true }));
  const keyMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xf0d6b8, metalness: 0.88, roughness: 0.18, clearcoat: 1, transparent: true }));
  const fading = [faceMaterial, metalMaterial, ridgeMaterial, cavityMaterial];

  const object = new THREE.Group(); scene.add(object);
  const lock = new THREE.Group(); lock.position.y = -0.48; object.add(lock);
  const body = new THREE.Group(); lock.add(body);

  // Body: dark lacquered faces, polished metal band (sides + bevel), real through-keyhole.
  const outline = roundedShape(BODY.width, BODY.height, BODY.radius);
  outline.holes.push(keyholePath());
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, { depth: BODY.depth, bevelEnabled: true, bevelSegments: 6, steps: 1, bevelSize: 0.06, bevelThickness: BODY.bevel, curveSegments: 56 });
  bodyGeometry.translate(0, 0, BODY.front - BODY.bevel - BODY.depth);
  body.add(new THREE.Mesh(bodyGeometry, [faceMaterial, metalMaterial]));
  // Dark floor of the keyhole; it starts to glow once the key has turned.
  const cavity = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(keyholePath().getPoints(64)), 1), cavityMaterial);
  cavity.position.z = KEY_SEAT_Z - 0.11; body.add(cavity);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(keyholePath().getPoints(96).slice(0, -1).map(p => new THREE.Vector3(p.x, p.y, BODY.front + 0.012)), true, 'centripetal'), 200, 0.016, 8, true), metalMaterial);
  body.add(ring);

  // Engraved whorl, generated from maths so it is clean, coherent and centred on the keyhole.
  const reliefGeometry = new THREE.PlaneGeometry(ridgeArea.width, ridgeArea.height, 160, 212);
  const positions = reliefGeometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, BODY.front + 0.008 + 0.05 * Math.sqrt(Math.max(0, 1 - (x / 1.3) ** 2 - (y / 1.75) ** 2)));
  }
  reliefGeometry.computeVertexNormals();
  const relief = new THREE.Mesh(reliefGeometry, ridgeMaterial); relief.renderOrder = 2; body.add(relief);
  const print = renderFingerprint(720);
  const crisp = new THREE.CanvasTexture(fingerprintCanvas(print, 'crisp'));
  const soft = new THREE.CanvasTexture(fingerprintCanvas(print, 'soft'));
  for (const texture of [crisp, soft]) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  ridgeMaterial.alphaMap = crisp;
  ridgeMaterial.bumpMap = soft; ridgeMaterial.bumpScale = 2.2;
  ridgeMaterial.displacementMap = soft; ridgeMaterial.displacementScale = 0.018;

  // Shackle: lifts out of the body, then swings around its long leg like a real padlock.
  const shackleLift = new THREE.Group(); shackleLift.position.z = BODY_MID_Z; lock.add(shackleLift);
  const shacklePivot = new THREE.Group(); shacklePivot.position.x = SHACKLE.x; shackleLift.add(shacklePivot);
  const shacklePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 14; i++) shacklePoints.push(new THREE.Vector3(SHACKLE.x, mix(SHACKLE.longEnd, SHACKLE.top, i / 14), 0));
  for (let i = 1; i < 40; i++) { const a = Math.PI * i / 40; shacklePoints.push(new THREE.Vector3(SHACKLE.x * Math.cos(a), SHACKLE.top + SHACKLE.x * Math.sin(a), 0)); }
  for (let i = 0; i <= 10; i++) shacklePoints.push(new THREE.Vector3(-SHACKLE.x, mix(SHACKLE.top, SHACKLE.shortEnd, i / 10), 0));
  const shackleGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shacklePoints, false, 'centripetal'), 220, SHACKLE.radius, 24, false);
  shackleGeometry.translate(-SHACKLE.x, 0, 0);
  shacklePivot.add(new THREE.Mesh(shackleGeometry, metalMaterial));
  const tipGeometry = new THREE.SphereGeometry(SHACKLE.radius, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const tip = new THREE.Mesh(tipGeometry, metalMaterial); tip.position.set(-SHACKLE.x * 2, SHACKLE.shortEnd, 0); shacklePivot.add(tip);

  // Skeleton key built along +z from its tip: the shaft fits the round part, the bit fits the slot.
  const key = new THREE.Group(); lock.add(key);
  const shaft = new THREE.CylinderGeometry(0.075, 0.075, 1.25, 28); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, 0.625);
  const tipCap = new THREE.SphereGeometry(0.075, 20, 10); 
  const collar = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 32); collar.rotateX(Math.PI / 2); collar.translate(0, 0, 1.22);
  const neck = new THREE.CylinderGeometry(0.1, 0.08, 0.12, 28); neck.rotateX(Math.PI / 2); neck.translate(0, 0, 1.31);
  const bow = new THREE.TorusGeometry(0.27, 0.065, 20, 64); bow.rotateY(Math.PI / 2); bow.translate(0, 0, 1.64);
  const bowCore = new THREE.TorusGeometry(0.12, 0.03, 12, 40); bowCore.rotateY(Math.PI / 2); bowCore.translate(0, 0, 1.64);
  const bitShape = new THREE.Shape();
  bitShape.moveTo(0.03, 0); bitShape.lineTo(0.03, -0.42); bitShape.lineTo(0.11, -0.42); bitShape.lineTo(0.11, -0.31);
  bitShape.lineTo(0.17, -0.31); bitShape.lineTo(0.17, -0.42); bitShape.lineTo(0.31, -0.42); bitShape.lineTo(0.31, -0.24);
  bitShape.lineTo(0.25, -0.24); bitShape.lineTo(0.25, 0); bitShape.closePath();
  const bit = new THREE.ExtrudeGeometry(bitShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  bit.rotateY(-Math.PI / 2); bit.translate(0.035, 0, 0);
  for (const geometry of [shaft, tipCap, collar, neck, bow, bowCore, bit]) key.add(new THREE.Mesh(geometry, keyMaterial));

  const resize = () => {
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the whole lock (and the approaching key) framed on narrow stages.
    camera.position.z = 10.8 * Math.max(1, 0.75 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  resize();
  return {
    resize,
    pose(progress, px, py) {
      const reveal = smooth(stage(progress, 'reveal'));
      const approach = smooth(stage(progress, 'approach'));
      const insert = smooth(stage(progress, 'insert'));
      const turn = smooth(stage(progress, 'turn'));
      const releaseLinear = clamp(stage(progress, 'release'));
      const release = backOut(releaseLinear);
      const swing = smooth(stage(progress, 'swing'));
      const identity = smooth(stage(progress, 'identity'));
      const portable = smooth(stage(progress, 'portable'));

      // Three-quarter view so the key's depth reads; it settles face-on as it becomes the card.
      const view = -0.36 - 0.22 * approach * (1 - swing) + 0.08 * swing;
      object.rotation.set(mix(0.12 + py * 0.08, py * 0.03, identity), mix(view + px * 0.14, px * 0.05, identity), mix(-0.08, 0, identity));
      object.scale.setScalar(1 - identity * 0.16 - portable * 0.1);
      object.position.set(portable * -0.1, identity * 0.12 + Math.sin(releaseLinear * Math.PI) * 0.05, 0);
      body.scale.z = 1 - identity * 0.75;

      // Key: glides in from the front-left, aligns its bit with the slot, slides in, then a quarter turn.
      const arc = Math.sin(approach * Math.PI);
      key.position.set(mix(-2.1, 0, approach), mix(-1.5, keyhole.centerY, approach) + arc * 0.35, mix(3.2, KEY_SEAT_Z + KEY_TRAVEL, approach) - insert * KEY_TRAVEL);
      key.rotation.set(mix(0.45, 0, approach), mix(-0.95, 0, approach), mix(0.85, 0, approach) - turn * Math.PI / 2);
      key.position.x += Math.sin(turn * Math.PI) * 0.006; // tiny mechanical wobble while turning

      // Shackle pops free (with a little overshoot) and swings open.
      shackleLift.position.y = release * SHACKLE.lift;
      shacklePivot.rotation.y = swing * SHACKLE.swing;
      cavityMaterial.emissiveIntensity = turn * 0.9 * (1 - identity);

      const lockOpacity = 1 - identity;
      for (const material of fading) material.opacity = lockOpacity;
      keyMaterial.opacity = reveal * lockOpacity;
      lock.visible = lockOpacity > 0.005;
      key.visible = keyMaterial.opacity > 0.005;
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse(node => { if (node instanceof THREE.Mesh) node.geometry.dispose(); });
      crisp.dispose(); soft.dispose();
      for (const material of materials) material.dispose();
      environment.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
