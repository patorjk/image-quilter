const { constructImage } = require("./src/image-quilter");
const { Jimp } = require("jimp");

async function main() {
  const inputs = process.argv;
  const outputWidth = parseInt(inputs[2], 10) || 300;
  const outputHeight = parseInt(inputs[3], 10) || 300;
  const blockSize = parseInt(inputs[4], 10) || 100;
  const overlap = Math.floor(blockSize * (1 / 6));

  const outputImage = new Jimp({ width: outputWidth, height: outputHeight });

  await constructImage({ inputImageFile: "t20.png", outputImage, blockSize, overlap, showSeam: false });
  await outputImage.write("output.jpg");

}

try {
  main();
} catch (e) {
  console.error(e);
}
