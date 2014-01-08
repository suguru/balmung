
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

Start balmung server

```
balmung
```

Author
==========
Suguru Namura

License
==========
MIT

