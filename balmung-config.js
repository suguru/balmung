
var path = require('path');

/**
 * Default configuration for balmung
 */
module.exports = {

  // Source directory
  src: './content/src',
  // Working directory
  work: './content/work',
  // Destination directory to write final files
  dst: './content/dst',
  // Settings to be written
  settings: './content/balmung-settings.json',

  // resize default
  resize: {
    // ratio list to be generated
    ratio: [1.0, 1.3, 1.5, 2.0, 3.0],
    // base ratio of images in source directory
    base: 3.0,
    // unsharp option after resized
    unsharp: '2x1.4+0.5+0',
    // resizing concurrency
    concurrency: 4
  },

  // File name resolver for resizing
  // Default is xyz_10.png, xyz_20.png
  resizeNameResolver: function(filename, ratio) {
    var ext = path.extname(filename);
    var base = path.basename(filename, ext);
    ratio = Math.floor(ratio*10);
    return base + '_' + ratio + ext;
  },

  /**** Default configurations of image filters ****/

  // optimizer
  optimize: {
    // optimizing concurrency
    concurrency: 2,
    // Default image filter to be used
    tools: {
      jpg: ['jpegtran'],
      png: ['pngquant', 'optipng', 'zopfli'],
      gif: ['gifsicle']
    }
  },

  // pngquant
  pngquant: {
    color: 256, // 2-256
    speed: 3
  },

  // optipng
  optipng: {
    level: 3 // 0-7
  },

  // zopfli
  zopfli: {
    // lossy_transparent: true,
    // lossy_8bit: true
  },

  // jpegtran
  jpegtran: {
    optimize: true,
    copy: 'none'
  },

  // gifsicle
  gifsicle: {
    level: 3 // 1 - 3
  },

  // spritesmith
  spritesmith: {
  },

  logger: {
    appenders: {
      console: { type: 'console' }
    }
  }

};
