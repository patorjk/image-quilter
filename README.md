# image-quilter

Image Quilter

An implementation of the [Image Quilting](https://people.eecs.berkeley.edu/~efros/research/quilting/quilting.pdf)
algorithm. I made this just for fun. It's very rough at the moment.

## Example usage

To generate texture:

```
node index.js 1920 1080 58 ./t20.png
```

To generate frames for the illusion: (this is very slow)

```
node illusion.js 1920 1080 58 t20.png ./src/sticky-masks/fin_40-22.png
```
