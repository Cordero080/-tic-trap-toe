/* ── title.js — 3-D extruded title mesh ──
 *
 *  Uses Three.js FontLoader + TextGeometry to render "TIC-TRAP-TOE" as a real
 *  extruded 3-D mesh above the cube.
 *
 *  Two-material trick: TextGeometry assigns group 0 to front/back faces and
 *  group 1 to the extruded sides. Passing an array [frontMat, sideMat] gives
 *  the sides a visually distinct color so depth is obvious at a glance.
 *
 *  Slight X tilt (instead of pure lookAt) leans the top toward the camera so
 *  the top face of every letter stroke is visible — that's the foreshortening.
 *
 *  Usage:
 *    initTitle(scene, camera)   — call once at startup; loads font async
 *    updateTitle(t)             — call every frame inside tick()
 *
 *  To swap fonts later:
 *    1. Go to gero3.github.io/facetype.js, upload PressStart2P-Regular.ttf
 *    2. Download the JSON → save as css/fonts/PressStart2P.typeface.json
 *    3. Change the URL in initTitle() below to './css/fonts/PressStart2P.typeface.json'
 * ── */

import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader";
import { TextGeometry } from "three/addons/geometries/TextGeometry";

let titleMesh = null;
let _camera = null;

export function initTitle(scene, camera) {
  _camera = camera;

  // Spotlight from above — hard cone creates strong shadow under each letter's
  // top overhang, defining the extrusion depth dramatically
  const spot = new THREE.SpotLight(0xffffff, 6.0);
  spot.position.set(0, 22, 18); // ← above and slightly in front of the title
  spot.angle = Math.PI / 7; // ← cone width: smaller = tighter / harder edge
  spot.penumbra = 0.25; // ← 0 = razor edge, 1 = fully soft
  spot.decay = 1.2;
  spot.target.position.set(0, 10, 2); // ← aim at title position
  scene.add(spot);
  scene.add(spot.target);

  // Rim light from the left — grazes the right-side bevel edges
  const rimLeft = new THREE.DirectionalLight(0xffffff, 1.8);
  rimLeft.position.set(-18, 4, 10);
  scene.add(rimLeft);

  // Directional from upper-right — creates bright top-right on each letter face
  // and darker bottom-left, giving the front face shape and volume
  const shaper = new THREE.DirectionalLight(0xddccff, 2.4);
  shaper.position.set(12, 18, 20); // ← high, right, in front — adjust x/y to shift the gradient
  scene.add(shaper);

  const fontLoader = new FontLoader();
  fontLoader.load(
    "https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      const geo = new TextGeometry("TIC-TRAP-TOE", {
        font,
        size: 1.5, // ← letter height in world units
        height: 0.7, // ← extrusion depth — thicker = more visible top/side faces
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 6,
      });

      // Center geometry on its own bounding box
      geo.computeBoundingBox();
      const cx = -(geo.boundingBox.max.x - geo.boundingBox.min.x) / 2;
      const cy = -(geo.boundingBox.max.y - geo.boundingBox.min.y) / 2;
      geo.translate(cx, cy, 0);

      // Front/back face — dark purple (matches the brand color)
      const frontMat = new THREE.MeshStandardMaterial({
        color: 0x2d0060,
        metalness: 0.35,
        roughness: 0.25,
        emissive: new THREE.Color(0x2d0060),
        emissiveIntensity: 0.3,
      });

      // Extruded side faces — bright purple so they contrast hard against the front
      // This is the key trick: group 1 = sides, group 0 = front/back
      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x8833ff, // ← bright purple sides — change this to taste
        metalness: 0.5,
        roughness: 0.15,
        emissive: new THREE.Color(0x440088),
        emissiveIntensity: 0.2,
      });

      titleMesh = new THREE.Mesh(geo, [frontMat, sideMat]);
      titleMesh.position.set(0, 10, 2);
      scene.add(titleMesh);
    },
  );
}

export function updateTitle(t) {
  if (!titleMesh) return;
  titleMesh.position.y = 10 + Math.sin(t * 1.1) * 0.18;
  // Slight tilt: top leans toward camera so you see the top face of each letter stroke.
  // 0.22 rad ≈ 13° — enough to reveal depth, not so much it looks tilted weirdly.
  // ← increase toward 0.4 for more dramatic foreshortening, 0 = flat-on
  titleMesh.rotation.x = 0.22;
}
