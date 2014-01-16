
Balmung
==========

Balmung is tool for generating compressed and responsive images.

*This app is under development*

Features
==========

- Web UI
- Resize images for various pixel ratio
- Compress images
- Flexible compression settings per directory, file and size
- Export custom settings for grunt tasks (grunt-balmung)
- Automatic update of git or svn repository

Compression tools
==========

- png
  - pngquant
  - optipng
  - zopfli
- jpg
  - jpegtran
- gif
  - gifsicle

Quickstart
==========

Server should have installed ImageMagick before starting.

Install balmung

```
npm install -g balmung
```

To start balmung server, run

```
balmung
```

Access `http://127.0.0.1:7700` with your web browser after launching.

*Command line options*

* `config`: path of the config file
* `port`: port number to listen web

To execute with your customized configuration, run

```
balmung --config /etc/balmung.js --port 8080
```

Configuration
==========

You can customize balmung with simple javascript file.

```js
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
    // unsharp option after resizing
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
    color: 256,
    speed: 3
  },

  // optipng
  optipng: {
    level: 3
  },

  // zopfli
  zopfli: {
  },

  // jpegtran
  jpegtran: {
    optimize: true,
    copy: 'none'
  },

  // gifsicle
  gifsicle: {
    level: 3
  },

  logger: {
    appenders: {
      console: { type: 'console' }
    }
  }
  
};
```

Grunt
==========

grunt-balmung is a grunt task which optimize images with same options of balmung server.

```
npm install grunt-balmung --save-dev
```

grunt task

```js
{
  balmung: {
    ..
  }
}

```

Author
==========
Suguru Namura

License
==========
MIT

