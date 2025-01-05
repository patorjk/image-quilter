const { Jimp } = require("jimp");
const { intToRGBA, rgbaToInt } = require("@jimp/utils");
const { dijkstra, getGraphPath, cutGraph } = require("./dijkstra");


function createOverlapGraph(outputImage, xOffset, yOffset, block) {

  const graph = {};
  const weights = {};

  for (let row = 0; row < block.size; row++) {
    for (let col = 0; col < block.size; col++) {
      if (block.mask[row][col] !== 0) {
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

function createMaskForBlock({ maskType, blockSize, overlap }) {
  // if we're at the start of a new row, only the top overlaps
  let mask;
  if (maskType === "v") {
    mask = createMask({ blockSize, vVisible: overlap, hVisible: 0 });
  } else if (maskType === "h") {
    mask = createMask({ blockSize, vVisible: 0, hVisible: overlap });
  } else if (maskType === "b") {
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
 * @param overlap
 * @param maskType
 * @returns {{image, yOffset, xOffset, size, getPixelColor: (function(*, *): RGBAColor), mask: (*[]|*[])}}
 */
function createBlock(inputImage, xOffset, yOffset, blockSize, overlap, maskType = null) {
  return {
    xOffset,
    yOffset,
    size: blockSize,
    image: inputImage,
    mask: createMaskForBlock({ maskType, blockSize, overlap }),
    getPixelColor: (x, y) => {
      return intToRGBA(inputImage.getPixelColor(xOffset + x, yOffset + y));
    }
  };
}

function sumOfSquaredDifferences(block1, block2) {
  if (block1.size !== block2.size) throw new Error("Invalid block comparison");

  let ssd = 0;
  for (let row = 0; row < block1.size; row++) {
    for (let col = 0; col < block1.size; col++) {
      if (block1.mask[row][col] !== 0 && block2.mask[row][col] !== 0) {
        const color1 = block1.getPixelColor(col, row);
        const color2 = block2.getPixelColor(col, row);
        const diff = Math.abs(color1.r - color2.r) + Math.abs(color1.g - color2.g) + Math.abs(color1.b - color2.b);
        ssd = ssd + (diff * diff);
      }
    }
  }

  return ssd;
}

function getBlockOffsets({ inputImage, blockSize, count = 20 }) {
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

function getBlock({ blockSet, inputImage, row, col, blockSize, overlap, outputImage }) {
  // if we're at the top corner, nothing has been made yet so any block will work
  if (row === 0 && col === 0) return blockSet[0];

  // if we're at the start of a new row, only the top overlaps
  let maskType = row === 0 ? "h" : (col === 0) ? "v" : "b";
  const outputAreaBlock = createBlock(outputImage, (blockSize - overlap) * col, (blockSize - overlap) * row, blockSize, overlap, maskType);

  let bestBlockSet = blockSet[0];
  let bestSsd = -1;
  blockSet.forEach(block => {
    let ssd = sumOfSquaredDifferences(block, outputAreaBlock);
    if (bestSsd === -1 || ssd < bestSsd) {
      bestSsd = ssd;
      bestBlockSet = block;
    }
  });

  return bestBlockSet;
}

function getCutSegments({ block, blockSize, overlap, outputImage, row, col }) {
  let maskType = row === 0 && col !== 0 ? "h" : (col === 0 && row !== 0) ? "v" : row === 0 && col === 0 ? null : "b";

  if (maskType === null) {
    return {
      cut: {}
    };
  }

  const newMask = createMaskForBlock({ maskType, blockSize: block.size, overlap });
  block.mask = newMask;

  let startPoint, endPoint, middle = Math.floor(overlap / 2);
  if (maskType === "h") {
    startPoint = `${0}_${middle}`;
    endPoint = `${blockSize - 1}_${middle}`;
  } else if (maskType === "v") {
    startPoint = `${middle}_${0}`;
    endPoint = `${middle}_${blockSize - 1}`;
  } else if (maskType === "b") {
    startPoint = `${blockSize - 1}_${middle}`;
    endPoint = `${middle}_${blockSize - 1}`;
  }

  console.log(startPoint, endPoint);

  const graph = createOverlapGraph(outputImage, (blockSize - overlap) * col, (blockSize - overlap) * row, block);
  const paths = dijkstra(graph, startPoint);
  const cut = getGraphPath(endPoint, paths);
  const originalSegment = {};
  const newSegment = {};

  // We cut the graph into 3 pieces:
  // The "cut" or best path through the overlapping area, and the areas around the cut.
  // There will be 2 graphs once we remove the "cut", one graph represents the pixels in the original image, and one
  // graph represents the pixels for the block we are laying down.
  // We need to figure out which graph is which, and then return that info.
  const remainingGraph = cutGraph(graph, cut);
  console.log(cut);
  const remainingNodes = Object.keys(remainingGraph);
  //console.log(remainingNodes);
  if (remainingNodes.length > 0) {
    const seg1 = dijkstra(remainingGraph, remainingNodes[0]);
    console.log("-");
    //console.log(seg1);
  }

  //console.log(remainingGraph);

  return {
    originalSegment,
    newSegment,
    cut
  };
}

function placeBlock({ block, inputImage, outputImage, row, col, overlap, blockSize }) {
  let outputX = 0;
  let outputY = 0;

  const gridBlockSize = blockSize - overlap;

  const { cut } = getCutSegments({ block, blockSize, overlap, outputImage, row, col });

  //console.log(cut);
  //console.log(block);

  for (let y = 0; y < blockSize; y++) {
    for (let x = 0; x < blockSize; x++) {


      const color = block.getPixelColor(x, y);
      const newColor = rgbaToInt(color.r, color.g, color.b, color.a);
      const newX = (col * gridBlockSize) + outputX;
      const newY = (row * gridBlockSize) + outputY;
      if (newX < outputImage.bitmap.width && newY < outputImage.bitmap.height) {
        outputImage.setPixelColor(newColor, newX, newY);
      }
      outputX++;
    }
    outputX = 0;
    outputY++;
  }
}

async function constructImage({ inputImageFile, outputImage, blockSize, overlap }) {
  const inputImage = await Jimp.read(inputImageFile);

  const gridBlockSize = blockSize - overlap;
  console.log(gridBlockSize);
  console.log(outputImage.bitmap.width, outputImage.bitmap.height);

  const gridWidth = Math.ceil(outputImage.bitmap.width / gridBlockSize);
  const gridHeight = Math.ceil(outputImage.bitmap.height / gridBlockSize);

  console.log(gridWidth, gridHeight);

  let xx = 0;

  for (let col = 0; col < gridWidth; col++) {
    for (let row = 0; row < gridHeight; row++) {
      const blockSet = getBlockOffsets({ inputImage, blockSize });
      const block = getBlock({ blockSet, inputImage, row, col, overlap, blockSize, outputImage });
      placeBlock({ block, inputImage, outputImage, row, col, blockSize, overlap });
    }
  }

  await outputImage.write("output.jpg");
}

module.exports = { constructImage };
