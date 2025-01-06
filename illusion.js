const { constructImage } = require("./src/image-quilter");
const { Jimp } = require("jimp");
const { intToRGBA } = require("@jimp/utils");

async function main() {
  const inputs = process.argv;
  const outputWidth = parseInt(inputs[2], 10) || 1920;
  const outputHeight = parseInt(inputs[3], 10) || 1080;
  const blockSize = parseInt(inputs[4], 10) || 58;
  const overlap = Math.floor(blockSize * (1 / 6));

  const outputImage = new Jimp({ width: outputWidth, height: outputHeight });

  const maskImage = await Jimp.read("./src/sticky-masks/smile_40-22.png");
  const changeMask = [];
  for (let x = 0; x < maskImage.bitmap.width; x++) {
    changeMask[x] = [];
    for (let y = 0; y < maskImage.bitmap.height; y++) {
      const color = intToRGBA(outputImage.getPixelColor(x, y));
      if (color.r === 0 && color.g === 0 && color.b === 0) {
        changeMask[x][y] = 1;
      } else {
        changeMask[x][y] = 0;
      }
    }
  }

  console.log(changeMask);

  let gridPresets;

  for (let ii = 0; ii < 2; ii++) {

    const { grid } = await constructImage({
      inputImageFile: "t20.png", outputImage, blockSize, overlap, showSeam: false, gridPresets
    });
    await outputImage.write(`output_${ii}.jpg`);
    gridPresets = grid;

    // clear out certain values
    changeMask.forEach((cols, x) => {
      cols.forEach((val, y) => {
        if (gridPresets[x] && gridPresets[x][y] && val === 1) {
          gridPresets[x][y] = null;
        }
      });
    });

    console.log(gridPresets);
  }

}

try {
  main();
} catch (e) {
  console.error(e);
}
