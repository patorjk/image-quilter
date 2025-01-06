const { Jimp } = require("jimp");
const { intToRGBA, rgbaToInt } = require("@jimp/utils");
const { dijkstra, getGraphPath, cutGraph, getOriginalSegmentBorder, getOriginalSegmentNodes } = require("./dijkstra");


function createOverlapGraph(outputImage, xOffset, yOffset, block, overlapMask) {

  const graph = {};
  const weights = {};

  for (let row = 0; row < block.size; row++) {
    for (let col = 0; col < block.size; col++) {
      if (overlapMask[row][col] !== 0) {
        const color1 = intToRGBA(outputImage.getPixelColor(col + xOffset, row + yOffset));
        const color2 = block.getPixelColor(col, row);
        const diff = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        weights[`${row}_${col}`] = {
          row,
          col,
          weight: (diff * diff)
        };
      }
    }
  }

  const setEdge = (g, key, row, col) => {
    if (weights[`${row}_${col}`]) {
      g[key][`${row}_${col}`] = weights[`${row}_${col}`].weight;
    }
  };

  Object.keys(weights).forEach(key => {
    graph[key] = {};
    setEdge(graph, key, weights[key].row - 1, weights[key].col - 0);
    setEdge(graph, key, weights[key].row - 1, weights[key].col - 1);
    setEdge(graph, key, weights[key].row - 0, weights[key].col - 1);
    setEdge(graph, key, weights[key].row + 1, weights[key].col - 0);
    setEdge(graph, key, weights[key].row + 1, weights[key].col - 1);
    setEdge(graph, key, weights[key].row + 1, weights[key].col + 1);
    setEdge(graph, key, weights[key].row + 0, weights[key].col - 1);
    setEdge(graph, key, weights[key].row + 0, weights[key].col + 1);
  });

  return graph;
}

function createMask({ blockSize, vVisible = 0, hVisible = 0 }) {
  const mask = [];

  for (let row = 0; row < blockSize; row++) {
    mask[row] = [];
    for (let col = 0; col < blockSize; col++) {
      if (col < hVisible || row < vVisible) {
        mask[row][col] = 1;
      } else {
        mask[row][col] = 0;
      }
    }
  }
  return mask;
}

/**
 * Creates an overlap max (matrix of 0's and 1's) which indicates which pixels
 * of a block will be overlapping with the existing image.
 *
 * @param cutType
 * @param blockSize
 * @param overlap
 * @returns {*[]}
 */
function createOverlapMask({ cutType, blockSize, overlap }) {
  // if we're at the start of a new row, only the top overlaps
  let mask;
  if (cutType === "v") {
    mask = createMask({ blockSize, vVisible: overlap, hVisible: 0 });
  } else if (cutType === "h") {
    mask = createMask({ blockSize, vVisible: 0, hVisible: overlap });
  } else if (cutType === "b") {
    // here we need to factor in the top and left overlap
    mask = createMask({ blockSize, vVisible: overlap, hVisible: overlap });
  } else {
    mask = createMask({ blockSize });
  }
  return mask;
}

/**
 *
 * @param inputImage
 * @param xOffset
 * @param yOffset
 * @param blockSize
 * @returns {{image, yOffset, xOffset, size, getPixelColor: (function(*, *): RGBAColor)}}
 */
function createBlock(inputImage, xOffset, yOffset, blockSize) {
  return {
    xOffset,
    yOffset,
    size: blockSize,
    image: inputImage,
    getPixelColor: (x, y) => {
      return intToRGBA(inputImage.getPixelColor(xOffset + x, yOffset + y));
    }
  };
}

function sumOfSquaredDifferences(block1, block2, overlapMask) {
  if (block1.size !== block2.size) throw new Error("Invalid block comparison");

  let ssd = 0;
  for (let row = 0; row < block1.size; row++) {
    for (let col = 0; col < block1.size; col++) {
      if (overlapMask[row][col] !== 0) {
        const color1 = block1.getPixelColor(col, row);
        const color2 = block2.getPixelColor(col, row);
        const diff = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        ssd = ssd + (diff * diff);
      }
    }
  }

  return ssd;
}

function getBlockOffsets({ inputImage, blockSize, count = 50 }) {
  const maxY = inputImage.bitmap.height - blockSize;
  const maxX = inputImage.bitmap.width - blockSize;
  const ret = [];

  for (let ii = 0; ii < count; ii++) {
    const xOffset = Math.floor(Math.random() * maxX);
    const yOffset = Math.floor(Math.random() * maxY);
    ret.push(createBlock(inputImage, xOffset, yOffset, blockSize, 0));
  }

  return ret;
}

function getBlock({ blockSet, row, col, blockSize, overlap, outputImage }) {
  // if we're at the top corner, nothing has been made yet so any block will work
  if (row === 0 && col === 0) return blockSet[0];

  // if we're at the start of a new row, only the top overlaps
  let cutType = row === 0 ? "h" : (col === 0) ? "v" : "b";
  const outputAreaBlock = createBlock(outputImage, (blockSize - overlap) * col, (blockSize - overlap) * row, blockSize, overlap, cutType);
  const overlapMask = createOverlapMask({ cutType, blockSize: outputAreaBlock.size, overlap });

  let bestBlockSet = blockSet[0];
  let bestSsd = -1;
  blockSet.forEach(block => {
    let ssd = sumOfSquaredDifferences(block, outputAreaBlock, overlapMask);
    if (bestSsd === -1 || ssd < bestSsd) {
      bestSsd = ssd;
      bestBlockSet = block;
    }
  });

  return bestBlockSet;
}

function getCutSegments({ block, blockSize, overlap, outputImage, row, col }) {
  let cutType = row === 0 && col !== 0 ? "h" : (col === 0 && row !== 0) ? "v" : row === 0 && col === 0 ? null : "b";

  // if we're not doing a cut, just return
  if (cutType === null) return {};

  const overlapMask = createOverlapMask({ cutType, blockSize: block.size, overlap });

  let startPoint, endPoint, middle = Math.floor(overlap / 2);
  if (cutType === "h") {
    startPoint = `${0}_${middle}`;
    endPoint = `${blockSize - 1}_${middle}`;
  } else if (cutType === "v") {
    startPoint = `${middle}_${0}`;
    endPoint = `${middle}_${blockSize - 1}`;
  } else if (cutType === "b") {
    startPoint = `${blockSize - 1}_${middle}`;
    endPoint = `${middle}_${blockSize - 1}`;
  }

  // These are nodes that will either be on the cut, or in the original segment
  const origNodes = getOriginalSegmentBorder(cutType, startPoint, endPoint, middle);


  const graph = createOverlapGraph(outputImage, (blockSize - overlap) * col, (blockSize - overlap) * row, block, overlapMask);
  const paths = dijkstra(graph, startPoint);
  const cut = getGraphPath(endPoint, paths);
  let originalSegment = [];

  // We cut the graph into 3 pieces:
  // The "cut" or best path through the overlapping area, and the areas around the cut.
  // There will be 2 graphs once we remove the "cut", one graph represents the pixels in the original image, and one
  // graph represents the pixels for the block we are laying down.
  // We need to figure out which graph is which, and then return that info.
  const remainingGraph = cutGraph(graph, cut);

  const getOriginalSegmentNodes = (graph, originalNodesNotInCut, originalSegment) => {
    if (originalNodesNotInCut.length === 0) {
      return originalSegment;
    }

    const seg1 = dijkstra(remainingGraph, originalNodesNotInCut[0]);

    Object.keys(seg1).forEach(item => {
      if (isFinite(seg1[item].dist)) {
        originalSegment.push(item);
      }
    });

    getOriginalSegmentNodes(graph, originalNodesNotInCut.filter(item => originalSegment.indexOf(item) === -1), originalSegment);
  };

  const remainingNodes = Object.keys(remainingGraph);

  if (remainingNodes.length > 0) {
    let origNodesNotInCut = origNodes.filter(node => remainingNodes.indexOf(node) !== -1);
    getOriginalSegmentNodes(remainingNodes, origNodesNotInCut, originalSegment);
  }

  return {
    originalSegment,
    cut
  };
}

function placeBlock({ block, outputImage, row, col, overlap, blockSize, showSeam = false }) {
  const gridBlockSize = blockSize - overlap;
  const { originalSegment = [], cut = [] } = getCutSegments({ block, blockSize, overlap, outputImage, row, col });

  for (let y = 0; y < blockSize; y++) {
    for (let x = 0; x < blockSize; x++) {
      const outputX = (col * gridBlockSize) + x;
      const outputY = (row * gridBlockSize) + y;
      let lookup = `${y}_${x}`;
      let newColor = null;
      if (cut.indexOf && cut.indexOf(lookup) !== -1) {
        if (showSeam) {
          newColor = rgbaToInt(0, 0, 0, 1);
        } else {
          // Use a blended color for the seam
          let color1 = block.getPixelColor(x, y);
          let color2 = intToRGBA(outputImage.getPixelColor(outputX, outputY));
          newColor = rgbaToInt(Math.round((color1.r + color2.r) / 2), Math.round((color1.g + color2.g) / 2), Math.round((color1.b + color2.b) / 2), 1);
        }
      } else if (originalSegment.indexOf(lookup) === -1) {
        const color = block.getPixelColor(x, y);
        newColor = rgbaToInt(color.r, color.g, color.b, color.a);
      }

      if (newColor !== null) {
        if (outputX < outputImage.bitmap.width && outputY < outputImage.bitmap.height) {
          outputImage.setPixelColor(newColor, outputX, outputY);
        }
      }
    }
  }
}

async function constructImage({ inputImageFile, outputImage, blockSize, overlap, showSeam, gridPresets }) {
  const inputImage = await Jimp.read(inputImageFile);
  const gridBlockSize = blockSize - overlap;
  const gridWidth = Math.ceil(outputImage.bitmap.width / gridBlockSize);
  const gridHeight = Math.ceil(outputImage.bitmap.height / gridBlockSize);

  const grid = [];

  for (let col = 0; col < gridWidth; col++) {
    grid[col] = [];
    for (let row = 0; row < gridHeight; row++) {
      const blockSet = getBlockOffsets({ inputImage, blockSize });
      let block;
      if (gridPresets && gridPresets[col] && gridPresets[col][row]) {
        block = createBlock(inputImage, gridPresets[col][row].xOffset, gridPresets[col][row].yOffset, blockSize);
      } else {
        block = getBlock({ blockSet, row, col, overlap, blockSize, outputImage });
      }
      placeBlock({ block, inputImage, outputImage, row, col, blockSize, overlap, showSeam });

      grid[col][row] = { xOffset: block.xOffset, yOffset: block.yOffset };
    }
  }

  return { outputImage, grid };
}

module.exports = { constructImage };
