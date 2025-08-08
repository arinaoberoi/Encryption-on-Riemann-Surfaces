# Riemann Surface Encryption & Visualisation

This project is a self‑contained web application that demonstrates how ideas
from **complex analysis** and **modular arithmetic** can be used to encrypt
plain text into geometric data points on a **Riemann surface**. The encrypted
data are then rendered in real time as a 3D visualisation directly in the
browser.

## Features

* **Input any text** — the application converts each character into a pair of
  numbers using modular arithmetic and uses those numbers as angles on a
  torus (a classic example of a Riemann surface).  The same character data
  are also used to define a complex number which is fed through a polynomial
  map to illustrate a different type of Riemann surface.
* **Configurable keys** — change the encryption keys (multipliers and
  moduli) to see how the mapping of characters to the surface changes.
* **Interactive 3D** — the visualisation is built on top of
  [Three.js](https://threejs.org/) with orbit controls, so you can pan,
  zoom and rotate the view.
* **No external build tools** — the entire app is written in plain HTML,
  CSS and modern JavaScript modules.  To run it locally you only need a
  static file server (or open `index.html` directly in a modern browser).

## Encryption schemes

Two different mappings are implemented in `app.js`:

1. **Torus encryption (modular arithmetic)**

   Each character’s Unicode code point `c` is multiplied by two user supplied
   integers (`key1` and `key2`) and reduced modulo two primes (`mod1` and
   `mod2`).  The resulting integers are interpreted as angles on a torus
   (major angle θ and minor angle φ).  A point `(x, y, z)` on the torus is
   computed via

   ```text
   θ = 2 π ((c × key1) mod mod1) / mod1
   φ = 2 π ((c × key2) mod mod2) / mod2
   x = (R + r cos φ) cos θ
   y = (R + r cos φ) sin θ
   z = r sin φ
   ```

   with constants `R = 3` (major radius) and `r = 1` (minor radius).  A torus
   is a compact Riemann surface of genus 1, and using modular arithmetic to
   wrap angles captures the idea of passing from the complex plane to a
   periodic quotient.

2. **Polynomial surface encryption (complex analysis)**

   For a more classical Riemann surface we start by forming a complex
   number

   ```text
   z = c + i ((c × key3) mod mod3)
   ```

   where `key3` and `mod3` are user supplied.  We then map `z` through the
   polynomial `w = √(z³ – 1)`.  Each character thus determines a point
   `(Re(z), Im(z), Re(w))` in 3‑space.  The square root introduces two
   branches of `w`; we always select the principal branch for simplicity.

## Running locally

No compilation is necessary.  If you have Python installed you can run

```sh
python3 -m http.server 8000
```

inside the project directory and then navigate to
`http://localhost:8000` in your browser.  Alternatively, simply open
`index.html` directly in a modern browser (tested in Chrome 112+, Safari
16+ and Firefox 113+).

## Repository contents

```
riemann-visualizer-app/
├── index.html    # Main webpage
├── style.css     # Basic styling
├── app.js        # Encryption logic and 3D visualisation
└── README.md     # This documentation
```

Feel free to clone this repository to your own GitHub account and extend
the encryption algorithms, add new surface types or improve the
visualisations.  Pull requests are welcome!