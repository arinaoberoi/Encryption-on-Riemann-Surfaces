/**
 * Riemann Surface Encryption Visualiser (Canvas Edition)
 *
 * This version of the visualiser avoids external dependencies by using
 * plain HTML5 Canvas for the 3D rendering.  We implement a simple
 * perspective projection, manually apply rotations about the X and Y
 * axes and listen for mouse events to allow the user to orbit around
 * the origin.  Two encryption schemes map characters to 3D points
 * living on a torus and on a polynomially defined Riemann surface.
 */

// ------------------------ Complex number helper -----------------------------

/**
 * Minimal complex number class supporting addition, subtraction,
 * multiplication, integer powers and principal square root.  These
 * operations are sufficient for our polynomial mapping.
 */
class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }
  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }
  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }
  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }
  pow(n) {
    let result = new Complex(1, 0);
    for (let i = 0; i < n; i++) {
      result = result.mul(this);
    }
    return result;
  }
  sqrt() {
    const r = Math.hypot(this.re, this.im);
    const sqrtMag = Math.sqrt(r);
    const theta = Math.atan2(this.im, this.re);
    const halfTheta = theta / 2;
    return new Complex(
      sqrtMag * Math.cos(halfTheta),
      sqrtMag * Math.sin(halfTheta)
    );
  }
}

// --------------------- Encryption functions --------------------------------

/**
 * Encrypt a string onto a torus using modular arithmetic.  Returns an
 * array of plain objects with x, y, z coordinates.
 *
 * @param {string} text
 * @param {number} key1
 * @param {number} mod1
 * @param {number} key2
 * @param {number} mod2
 * @returns {{x:number,y:number,z:number}[]}
 */
function encryptToTorus(text, key1, mod1, key2, mod2) {
  const pts = [];
  const R = 3;
  const r = 1;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const theta = ((code * key1) % mod1) / mod1 * 2 * Math.PI;
    const phi = ((code * key2) % mod2) / mod2 * 2 * Math.PI;
    const x = (R + r * Math.cos(phi)) * Math.cos(theta);
    const y = (R + r * Math.cos(phi)) * Math.sin(theta);
    const z = r * Math.sin(phi);
    pts.push({ x, y, z });
  }
  return pts;
}

/**
 * Encrypt a string via a polynomial mapping in the complex plane.  For
 * each character code `c` we build a complex number `z = c + i ((c×key)
 * mod modVal)` and compute `w = sqrt(z^3 − 1)`.  A 3D point is
 * constructed as `(Re(z), Im(z), Re(w))`, scaled down for display.
 *
 * @param {string} text
 * @param {number} key
 * @param {number} modVal
 * @returns {{x:number,y:number,z:number}[]}
 */
function encryptToPolynomial(text, key, modVal) {
  const pts = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const real = c;
    const imag = (c * key) % modVal;
    const z = new Complex(real, imag);
    const w = z.pow(3).sub(new Complex(1, 0)).sqrt();
    // Scale down to prevent huge coordinate values dominating the view
    const scale = 0.05;
    pts.push({ x: z.re * scale, y: z.im * scale, z: w.re * scale });
  }
  return pts;
}

// ---------------------- 3D rendering setup ---------------------------------

// DOM references
const container = document.getElementById('sceneContainer');
const statusEl = document.getElementById('status');

// Create and insert the canvas used for drawing
const canvas = document.createElement('canvas');
canvas.style.display = 'block';
canvas.style.width = '100%';
canvas.style.height = '100%';
container.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Resize the canvas to match the container
function resizeCanvas() {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Camera and projection settings
let rotX = 0.4; // rotation around X axis (vertical tilt)
let rotY = 0.8; // rotation around Y axis (horizontal yaw)
const cameraDistance = 10; // distance of the camera from origin
const scaleFactor = 120; // scaling factor from world units to pixels

// Mouse interaction state
let dragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  lastMouse.x = e.clientX;
  lastMouse.y = e.clientY;
});
canvas.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  rotY += dx * 0.005;
  rotX += dy * 0.005;
  const limit = Math.PI / 2 - 0.1;
  rotX = Math.max(-limit, Math.min(limit, rotX));
  lastMouse.x = e.clientX;
  lastMouse.y = e.clientY;
});
['mouseup', 'mouseleave'].forEach((evt) => {
  canvas.addEventListener(evt, () => {
    dragging = false;
  });
});

// Data storage for current encryption results
let torusData = [];
let polyData = [];
let showTorus = true;
let showComplex = true;

/**
 * Apply the current rotation and projection to a 3D point.  Returns
 * projected screen coordinates and depth.  The camera is fixed at
 * (0,0,cameraDistance) looking toward the origin; we rotate the
 * scene rather than the camera for simplicity.
 *
 * @param {{x:number,y:number,z:number}} p 3D point
 * @returns {{sx:number, sy:number, depth:number}}
 */
function projectPoint(p) {
  // Rotation about X axis (vertical), then Y axis (horizontal)
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  // Apply rotation: first X, then Y
  let y1 = p.y * cosX - p.z * sinX;
  let z1 = p.y * sinX + p.z * cosX;
  let x2 = p.x * cosY + z1 * sinY;
  let z2 = -p.x * sinY + z1 * cosY;
  // Translate along z-axis by cameraDistance
  const zCam = z2 + cameraDistance;
  const scale = cameraDistance / zCam;
  const sx = x2 * scale * scaleFactor + canvas.width / 2;
  const sy = -y1 * scale * scaleFactor + canvas.height / 2;
  return { sx, sy, depth: zCam };
}

/**
 * Draw the base torus grid for reference.  We iterate over a coarse grid
 * in (θ, φ) parameter space and draw two sets of rings to indicate the
 * underlying topology.  The grid is recomputed every frame so that
 * rotations are applied properly.
 */
function drawTorusGrid() {
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  const majorSteps = 24;
  const minorSteps = 12;
  const R = 3;
  const r = 1;
  // Draw rings with constant θ (circles around minor radius)
  for (let i = 0; i <= majorSteps; i++) {
    const theta = (i / majorSteps) * 2 * Math.PI;
    ctx.beginPath();
    for (let j = 0; j <= minorSteps; j++) {
      const phi = (j / minorSteps) * 2 * Math.PI;
      const x = (R + r * Math.cos(phi)) * Math.cos(theta);
      const y = (R + r * Math.cos(phi)) * Math.sin(theta);
      const z = r * Math.sin(phi);
      const proj = projectPoint({ x, y, z });
      if (j === 0) ctx.moveTo(proj.sx, proj.sy);
      else ctx.lineTo(proj.sx, proj.sy);
    }
    ctx.stroke();
  }
  // Draw rings with constant φ (circles around major radius)
  for (let j = 0; j <= minorSteps; j++) {
    const phi = (j / minorSteps) * 2 * Math.PI;
    ctx.beginPath();
    for (let i = 0; i <= majorSteps; i++) {
      const theta = (i / majorSteps) * 2 * Math.PI;
      const x = (R + r * Math.cos(phi)) * Math.cos(theta);
      const y = (R + r * Math.cos(phi)) * Math.sin(theta);
      const z = r * Math.sin(phi);
      const proj = projectPoint({ x, y, z });
      if (i === 0) ctx.moveTo(proj.sx, proj.sy);
      else ctx.lineTo(proj.sx, proj.sy);
    }
    ctx.stroke();
  }
}

/**
 * Draw a set of 3D points connected by a polyline.  The `color` should
 * be any valid canvas strokeStyle; `fillColor` is used for the point
 * markers.  The points are projected and drawn in order.
 *
 * @param {{x:number,y:number,z:number}[]} pts
 * @param {string} color
 */
function drawDataSet(pts, color) {
  if (pts.length === 0) return;
  // Project all points first
  const projected = pts.map((p) => projectPoint(p));
  // Draw polyline
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(projected[0].sx, projected[0].sy);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].sx, projected[i].sy);
  }
  ctx.stroke();
  // Draw point markers
  ctx.fillStyle = color;
  projected.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/**
 * Main draw function executed every animation frame.  Clears the
 * canvas, draws the torus grid and then draws any active data sets.
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Base torus grid for context
  drawTorusGrid();
  // Draw data sets on top
  if (showTorus) drawDataSet(torusData, '#0066cc');
  if (showComplex) drawDataSet(polyData, '#cc3300');
}

/**
 * Animation loop using requestAnimationFrame.  Continuously redraws
 * the scene and schedules the next frame.
 */
function animate() {
  draw();
  requestAnimationFrame(animate);
}

/**
 * Read the UI controls and recompute the encrypted point sets.  Also
 * update the status text to inform the user of how many points were
 * produced and which surfaces are displayed.
 */
function updateVisualisation() {
  const text = document.getElementById('inputText').value;
  const key1 = parseInt(document.getElementById('key1').value, 10) || 1;
  const mod1 = parseInt(document.getElementById('mod1').value, 10) || 2;
  const key2 = parseInt(document.getElementById('key2').value, 10) || 1;
  const mod2 = parseInt(document.getElementById('mod2').value, 10) || 2;
  const key3 = parseInt(document.getElementById('key3').value, 10) || 1;
  const mod3 = parseInt(document.getElementById('mod3').value, 10) || 2;
  showTorus = document.getElementById('showTorus').checked;
  showComplex = document.getElementById('showComplex').checked;
  torusData = [];
  polyData = [];
  if (showTorus && text.length > 0) {
    torusData = encryptToTorus(text, key1, mod1, key2, mod2);
  }
  if (showComplex && text.length > 0) {
    polyData = encryptToPolynomial(text, key3, mod3);
  }
  // Update status message
  const surfaces = [];
  if (showTorus) surfaces.push('torus');
  if (showComplex) surfaces.push('polynomial surface');
  statusEl.textContent = text.length > 0
    ? `Encoded ${text.length} character${text.length === 1 ? '' : 's'} on ${surfaces.join(' and ')}.`
    : 'Enter some text and click "Encrypt & Visualise".';
}

// Hook up UI events
document.getElementById('encryptButton').addEventListener('click', updateVisualisation);
document.getElementById('showTorus').addEventListener('change', () => {
  showTorus = document.getElementById('showTorus').checked;
  updateVisualisation();
});
document.getElementById('showComplex').addEventListener('change', () => {
  showComplex = document.getElementById('showComplex').checked;
  updateVisualisation();
});

// Perform an initial visualisation and start the animation loop
updateVisualisation();
animate();