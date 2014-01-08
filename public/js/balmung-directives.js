/* global angular,_ */
'use strict';
angular
.module('balmung')
.directive('balmungLastClass', function() {
})
.directive('balmungFileRow', function() {
  return function(scope, element) {
    var flags = scope.file.flags || {};
    if (flags.resize) {
      element.find('td.status span.glyphicon').addClass('glyphicon-resize-small');
    } else if (flags.optimize) {
      element.find('td.status span.glyphicon').addClass('glyphicon-asterisk');
    }
  };
})
.directive('balmungSizeColumn', function($filter, preview) {
  return function(scope, element) {

    var file = scope.file;
    var ratio = scope.ratio;
    var work = file.work[ratio];
    var dst = file.dst[ratio];

    if (dst) {
      element.find('.bytes').text($filter('filesize')(work.size));
      var compress = dst.compress;
      var label = element.find('.compress');
      label.text($filter('percentage')(compress));
      if (compress === 0) {
        label.addClass('label-default');
      } else if (compress < 0.1) {
        label.addClass('label-danger');
      } else if (compress < 0.3) {
        label.addClass('label-warning');
      } else if (compress < 0.5) {
        label.addClass('label-primary');
      } else {
        label.addClass('label-success');
      }
    }
    scope.preview = function() {
      preview(file, ratio, work, dst);
    };
  };
})
.directive('balmungPreview', function(pixelRatio) {
  return function(scope, element) {

    var file = scope.file;
    var ratio = scope.ratio;
    var work = file.work[ratio];
    var dst = file.dst[ratio];

    var width = Math.floor((work.width + dst.width) / pixelRatio) + 80;
    width = Math.max(width, 550);

    var elem = element.parent().parent();
    elem.width(width);

    var imgw = Math.floor(work.width / pixelRatio);

    var workimg = $('<img />')
    .attr('src', '/content/work/' + work.path)
    .attr('width',  imgw)
    .on('click', function() {
      window.open('/content/work/' + work.path, '_blank');
    });

    var dstimg = $('<img />')
    .attr('src', '/content/dst/' + dst.path)
    .attr('width',  imgw)
    .on('click', function() {
      window.open('/content/dst/' + dst.path, '_blank');
    });

    scope.bgchange = function(color) {
      if (color.charAt(0) === '/') {
        element.find('.images')
        .css('backgroundColor', 'transparent')
        .css('backgroundImage', 'url(' + color + ')');
      } else {
        element.find('.images')
        .css('backgroundColor', color)
        .css('backgroundImage', 'none')
        ;
      }
    };

    element.find('.work .image').append(workimg);
    element.find('.dst .image').append(dstimg);

  };
})
;
