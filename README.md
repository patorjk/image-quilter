# image-quilter

A Node.js implementation of the [Image Quilting for Texture Synthesis and Transfer](https://people.eecs.berkeley.edu/~efros/research/quilting/quilting.pdf) algorithm by Efros and Freeman (SIGGRAPH 2001).

This repo contains two scripts:

- **`index.js`**: Generates a seamlessly tiled texture by quilting together patches from a source image.
- **`illusion.js`**: Generates animation frames for a persistence of vision (POV) illusion where the image will disappear when the video is paused.

The illusion is demonstrated in [this YouTube video](https://www.youtube.com/watch?v=ZqGfb_Vlrig).

---

## Prerequisites

Node.js v18 or later is recommended.

**Check if installed:**
```bash
node --version
npm --version
```

**Install Node.js:**
- **macOS:** Download from [nodejs.org](https://nodejs.org/) or via Homebrew: `brew install node`
- **Ubuntu/Debian:** `sudo apt-get install nodejs npm`
- **Windows:** Download the installer from [nodejs.org](https://nodejs.org/)

---

## Installation

```bash
git clone https://github.com/patorjk/image-quilter.git
cd image-quilter
npm install
```

---

## Usage

### Texture Synthesis (`index.js`)

Quilts a new texture of any size from a small source texture image.

```
node index.js <width> <height> <blockSize> <source>
```

| Argument | Description |
|---|---|
| `width` | Output image width in pixels |
| `height` | Output image height in pixels |
| `blockSize` | Size of the square patches to sample (pixels). Larger = chunkier texture, faster; smaller = finer detail, slower |
| `source` | Path to the source texture image |

**Example** 

Generate a 1920×1080 texture using 58px patches from the included sample:

```bash
node index.js 1920 1080 58 ./t20.png
```

A sample texture (`t20.png`) is included in the repo to get started. Any small, tileable-looking image works well as a source.

---

### Illusion Frames (`illusion.js`)

Generates a sequence of frames for the POV illusion. The hidden image is defined by a mask; the rest of the frame is re-synthesized each time.

> ⚠️ This is slow. Expect several minutes for a 1080p output.

```
node illusion.js <width> <height> <blockSize> <source> <mask>
```

| Argument | Description |
|---|---|
| `width` | Frame width in pixels |
| `height` | Frame height in pixels |
| `blockSize` | Patch size in pixels |
| `source` | Path to the source texture image |
| `mask` | Path to the mask image. White pixels mark the static region (the hidden image); black pixels are re-quilted each frame |

**Example:**
```bash
node illusion.js 1920 1080 58 t20.png ./src/sticky-masks/fin_40-22.png
```

Once you have your frames, assemble them into a video with ffmpeg:
```bash
ffmpeg -framerate 30 -pattern_type glob -i './output/*.png' \
  -c:v libx264 -pix_fmt yuv420p illusion.mp4
```

---

## Project Structure

```
image-quilter/
├── index.js                  # CLI entry point: texture synthesis
├── illusion.js               # CLI entry point: illusion frame generator
├── t20.png                   # Sample source texture
└── src/
    ├── image-quilter.js      # Core quilting algorithm
    ├── dijkstra.js           # Dijkstra's shortest path (used for seam finding)
    └── sticky-masks/         # Mask images for the illusion script
```

---

## References

Efros, A. A., & Freeman, W. T. (2001). [Image Quilting for Texture Synthesis and Transfer](https://people.eecs.berkeley.edu/~efros/research/quilting/quilting.pdf). *Proceedings of SIGGRAPH 2001*.

