/* global angular,io */
'use strict';
angular
.module('balmung')
.service('preview', function($modal, settingService, growl) {

  return function(file, ratio, work, dst) {

    $modal.open({
      templateUrl: '/template/preview.html',
      backdrop: true,
      windowClass: 'modal',
      controller: function($scope, $modalInstance) {
        $scope.file = file;
        $scope.ratio = ratio;
        $scope.work = work;
        $scope.dst = dst;
        $scope.cancel = function() {
          $modalInstance.dismiss('cancel');
        };
        settingService.load(file.path, function(err, settings) {
          if (err) {
            growl.addErrorMessage(err.message);
          } else {
            $scope.settings = settings;
          }
        });
      }
    });
  };
})
.service('socket', function() {

  var socket = io.connect();

  return {

    on: function(scope, name, handler) {
      socket.on(name, handler);
      // remove listener if scope provided
      if (scope) {
        scope.$on('$destroy', function() {
          socket.removeListener(name, handler);
        });
      }
    },

    off: function(name, handler) {
      socket.removeListener(name, handler);
    }

  };

})
.service('settingService', function($http, optimizeService) {

  return {
    save: function(path, settings, callback) {
      $http
      .post('/api/settings/save', { path: path, settings: settings })
      .success(function(data) {
        callback(null, data);

        // optiize immediate if target is file
        var extmatch = /\.[a-z0-9]+$/i.exec(path);
        if (extmatch && extmatch[0]) {
          var ext = extmatch[0].toLowerCase();
          if (ext === '.png' || ext === '.jpg' || ext === '.gif') {
            optimizeService.file(path);
          }
        }
      })
      .error(function(err) {
        callback(new Error(err));
      })
      ;
    },
    load: function(path, callback) {
      $http
      .post('/api/settings/load', { path: path })
      .success(function(data) {
        callback(null, data);
      })
      .error(function(err) {
        callback(new Error(err));
      });
    }
  };

})
.service('optimizeService', function($http, growl) {

  return {
    dir: function(path) {
      $http
      .post('/api/optimize/dir', { path: path })
      .success(function() {
        growl.addInfoMessage('Start optimizing ' + path, { ttl: 3000 });
      })
      .error(function(err) {
        growl.addErrorMessage('Failed to start optimizing ' + path + ' ' + err, { ttl: 3000 });
      });
    },
    file: function(path, ratio) {
      $http
      .post('/api/optimize/file', { path: path, ratio: ratio })
      .success(function() {
        growl.addInfoMessage('Start optimizing file ' + path, { ttl: 3000 });
      })
      .error(function(err) {
        growl.addErrorMessage('Failed to start optimizing ' + path + ' ' + err, { ttl: 3000 });
      });
    }
  };

})
;

