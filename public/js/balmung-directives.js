/* global angular */
'use strict';
angular
.module('balmung')
.directive('balmungSetting', function() {
  return {
    restrict: 'A',
    scope: {
      title: '@',
      settings: '=',
      path: '=',
      optimizeIcon: '='
    },
    controller: function($scope, optimizeService) {
      $scope.optimize = function() {
        optimizeService.dir($scope.path);
      };
    },
    templateUrl: '/template/setting.html'
  };
})
.directive('balmungFileRow', function(socket, optimizeService) {
  return function(scope) {
    var file = scope.file;
    socket.on(scope, 'optimize', function(data) {
      if (file.path === data.dir + '/' + data.base) {
        if (data.type === 'start') {
          file.flags.optimize = true;
        } else {
          file.flags.optimize = false;
        }
        scope.$digest();
      }
    });
    socket.on(scope, 'resize', function(data) {
      if (file.path === data.dir + '/' + data.file) {
        if (data.type === 'start') {
          file.flags.resize = true;
        } else {
          file.flags.resize = false;
        }
        scope.$digest();
      }
    });
    scope.optimize = function() {
      optimizeService.file(file.path);
    };
  };
})
.directive('balmungSlider', function($compile) {

  var tooltipTemplate =
    '<div class="tooltip bottom slider">' +
    '<div class="tooltip-arrow"/>' +
    '<div class="tooltip-inner">' +
    '<form role="form">' +
    '<input class="form-control input-sm" type="number" ng-model="value" />' +
    '<input type="range" ng-model="value" min="{{min}}" max="{{max}}" />' +
    '</form>' +
    '</div>' +
    '</div>';

  return {
    restrict: 'A',
    scope: {
      min: '@',
      max: '@',
      name: '@',
      setting: '=',
      settings: '=',
      path: '='
    },
    template: '<span class="name" ng-bind="name | uppercase" ng-click="toggle()" /><span class="value" ng-bind="value" />',
    controller: function($scope, $element, settingService, optimizeService, growl) {

      Object.defineProperty($scope, 'value', {
        set: function(value) {
          $scope.setting[$scope.name] = Number(value);
        },
        get: function() {
          return Number($scope.setting[$scope.name]);
        }
      });

      $element.on('click', function() {

        if ($element._tooltip) {
          return;
        }

        var compiled = $compile(tooltipTemplate);
        var tooltip = compiled($scope);
        $scope.$apply(tooltip);

        tooltip.on('click', function(e) {
          e.stopPropagation();
        });

        $element._tooltip = tooltip;
        // $element.append(tooltip);

        var offset = $element.find('.value').offset();

        $('body').append(tooltip);
        tooltip.css('left', offset.left);
        tooltip.css('top', offset.top + 18);

        setTimeout(function() {
          $('body').on('click.balmung-slider', function() {
            $(this).off('click.balmung-slider');
            tooltip.remove();
            delete $element._tooltip;
            settingService.save($scope.path, $scope.settings, function(err) {
              if (err) {
                growl.addErrorMessage(err.message);
              }
            });
          });
        }, 1);
      });
    }
  };
})
.directive('balmungOptimizeToggle', function() {
  return {
    restrict: 'A',
    controller: function($scope, $element, $attrs, settingService, growl) {

      var setting = $scope.settings[$attrs.name];
      $element.text($attrs.name.toUpperCase());

      var siblings = $element.siblings();

      var enable = function(save) {
        delete setting.disabled;
        $element
        .removeClass('label-default')
        .addClass('label-primary')
        .parent()
        .append(siblings)
        ;
        if (save !== false) {
          settingService.save($scope.path, $scope.settings, function(err) {
            if (err) {
              growl.addErrorMessage(err.message);
            }
          });
        }
      };

      var disable = function(save) {
        setting.disabled = true;
        $element
        .removeClass('label-primary')
        .addClass('label-default')
        ;
        siblings.detach();
        if (save !== false) {
          settingService.save($scope.path, $scope.settings, function(err) {
            if (err) {
              growl.addErrorMessage(err.message);
            }
          });
        }
      };

      if (setting.disabled) {
        disable(false);
      }
      $element.on('click', function() {
        if (setting.disabled) {
          enable();
        } else {
          disable();
        }
      });
    }
  };
})
.directive('balmungSizeColumn', function($filter, preview, socket) {
  return function(scope, element) {

    var file = scope.file;
    var ratio = scope.ratio;
    var work = file.work[ratio];
    var dst = file.dst[ratio];

    var apply = function(from, to) {
      element.find('.bytes.from').text($filter('filesize')(from));
      element.find('.bytes.to').text($filter('filesize')(to));
      var compress = Math.floor((1 - to / from) * 1000) / 1000;
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
    };

    socket.on(scope, 'optimize', function(data) {
      if (dst.path === data.dir + '/' + data.file) {
        if (data.type === 'start') {
          element.find('.flag').addClass('glyphicon-asterisk spin');
        } else {
          element.find('.flag').removeClass('glyphicon-asterisk spin');
          if (data.result) {
            apply(data.result.size.origin, data.result.size.last);
          }
        }
      }
    });

    if (dst) {
      apply(work.size, dst.size, dst.compress);
    }
    scope.preview = function() {
      preview(file, ratio, work, dst);
    };
  };
})
.directive('balmungPreview', function(pixelRatio, socket) {
  return function(scope, element) {

    var floor = Math.floor;
    var max = Math.max;
    var min = Math.min;

    var file = scope.file;
    var ratio = scope.ratio;
    var work = file.work[ratio];
    var dst = file.dst[ratio];
    var winw = window.innerWidth - 40;
    var wh = work.height / work.width;
    var pad = 10;
    var imgw = min(floor(winw / 2), floor(work.width / pixelRatio));
    var imgh = floor(imgw * wh);
    var imgRatio = work.width / imgw;

    var workimg = new Image();
    workimg.src = '/content/work/' + work.path;
    if (imgw < work.width) {
      workimg.style.width = imgw + 'px';
    }

    var dstimg = new Image();
    dstimg.src = '/content/dst/' + dst.path;
    if (imgw < dst.width) {
      dstimg.style.width = imgw + 'px';
    }

    var optcount = 0;
    socket.on(scope, 'optimize', function(data) {
      if (data.base === file.name) {
        if (data.type === 'start') {
          if (optcount === 0) {
            scope.optimizing = true;
            scope.$digest();
          }
          optcount++;
        } else {
          optcount--;
          if (data.dir + '/' + data.file === dst.path) {
            dstimg.src = '/content/dst/' + dst.path + '?' + Date.now();
            scope.optimizing = false;
            work.size = data.result.size.origin;
            dst.size = data.result.size.last;
            scope.$digest();
          }
        }
      }
    });

    var minWidth = 625;

    element
    .parent().parent()
    .width(max(imgw*2 + 32, minWidth));

    var canvas = document.createElement('canvas');
    canvas.width  = floor((imgw * 2 + pad) * pixelRatio);
    canvas.height = floor(max(300, imgh) * pixelRatio);
    if (pixelRatio > 1) {
      canvas.style.width  = floor(imgw * 2 + pad) + 'px';
      canvas.style.height = max(300, imgh) + 'px';
    }
    var canvasMargin = 0;
    if (floor(imgw*2+pad) < minWidth) {
      canvasMargin = floor((minWidth - imgw * 2 - pad) / 2) - 10;
      canvas.style.marginLeft = canvasMargin + 'px';
    }

    var zoomed = document.createElement('canvas');
    zoomed.setAttribute('class', 'zoomed');
    zoomed.width  = 400 * pixelRatio;
    zoomed.height = 200 * pixelRatio;
    if (pixelRatio > 1) {
      zoomed.style.width = '400px';
      zoomed.style.height = '200px';
    }

    var images = element.find('.images');

    images
    .append(workimg)
    .append(dstimg)
    ;

    scope.bgcolor = 'mesh';
    scope.bgchange = function(color) {
      if (color.charAt(0) === '/') {
        element.find('.images')
        .css('backgroundColor', 'transparent')
        .css('backgroundImage', 'url(' + color + ')');
        // TODO detect file
        scope.bgcolor = 'mesh';
      } else {
        element.find('.images')
        .css('backgroundColor', color)
        .css('backgroundImage', 'none')
        ;
        scope.bgcolor = color;
      }
    };

    var mesh = new Image();
    mesh.src = '/img/mesh.png';

    var clean = function() {
      $('body').off('mousemove.zoomer');
      canvas.width = canvas.width;
      // context.clearRect(0, 0, canvas.width, canvas.height);
      zoomed.remove();
    };

    element
    .find('.zoomer')
    .width(imgw * 2 + pad)
    .append(canvas)
    .on('mouseenter', function() {

      var lens = {
        width: min(50, imgw),
        height: min(50, imgh),
        x: 0,
        y: 0
      };

      element.find('.zoomer').append(zoomed);

      var context = canvas.getContext('2d');
      var meshes = context.createPattern(mesh, 'repeat');

      $('body')
      .on('mousemove.zoomer', function(e) {

        if ($('body').find('.balmung-preview-body').length === 0) {
          return clean();
        }

        var offset = $(canvas).offset();
        var x = floor(e.pageX - offset.left) - pad;
        var y = floor(e.pageY - offset.top) - pad;
        var isLeft = true;
        // right side image
        if (x > imgw + pad) {
          x = x - imgw - pad;
          isLeft = false;
        }

        var lx = x - floor(lens.width  / 2);
        var ly = y - floor(lens.height / 2);

        // lens position
        lens.x = max(0, min(imgw - lens.width , lx));
        lens.y = max(0, min(imgh - lens.height, ly));

        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw selected area
        context.save();
        context.scale(pixelRatio, pixelRatio);

        context.fillStyle = 'rgba(255,255,255,0.3)';
        context.fillRect(0, 0, imgw, imgh);
        context.fillRect(imgw + pad, 0, imgw, imgh);

        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = '#fff';
        context.fillRect(lens.x, lens.y, lens.width, lens.height);
        context.fillRect(lens.x + imgw + pad, lens.y, lens.width, lens.height);

        context.restore();

        // draw zoomed images
        var zoomContext = zoomed.getContext('2d');
        zoomed.width = zoomed.width;
        zoomContext.save();
        zoomContext.scale(pixelRatio, pixelRatio);
        if (scope.bgcolor === 'mesh') {
          zoomContext.fillStyle = meshes;
        } else {
          zoomContext.fillStyle = scope.bgcolor;
        }
        zoomContext.fillRect(0, 0, zoomed.width, zoomed.height);
        // if (y > imgh / 2) {
        zoomContext.drawImage(
          workimg,
          floor(lens.x * imgRatio),
          floor(lens.y * imgRatio),
          floor(lens.width * imgRatio),
          floor(lens.height * imgRatio),
          0,
          0,
          lens.width * 4,
          lens.height * 4
        );
        // }
        zoomContext.drawImage(
          dstimg,
          floor(lens.x * imgRatio),
          floor(lens.y * imgRatio),
          floor(lens.width * imgRatio),
          floor(lens.height * imgRatio),
          200,
          0,
          lens.width * 4,
          lens.height * 4
        );

        zoomed.style.top  = lens.y + 80 + 'px';
        if (isLeft) {
          zoomed.style.left = canvasMargin + lens.x - 165 + 'px';
        } else {
          zoomed.style.left = canvasMargin + lens.x - 165 + imgw + pad + 'px';
        }

        context.restore();

      });
    })
    .on('mouseleave', function() {
      clean();
    })
    ;
  };
})
;
