/* global angular,io */
'use strict';
angular
.module('balmung')
.service('preview', function($modal) {

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
          console.log("DESTROYED SOCKET LISTENER", name);
          socket.removeListener(name, handler);
        });
      }
    },

    off: function(name, handler) {
      socket.removeListener(name, handler);
    }

  };

})
.service('settingService', function($http) {

  return {
    save: function(path, settings, callback) {
      $http
      .post('/api/settings/save', { path: path, settings: settings })
      .success(function(data) {
        callback(null, data);
      })
      .error(function(err) {
        callback(new Error(err));
      })
      ;
    },
    load: function(path, callback) {
      $http
      .post('/api/settings/get', { path: path })
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

  return function(path) {
    $http
    .post('/api/optimize/dir', { path: path })
    .success(function() {
      growl.addInfoMessage('Start optimizing ' + path, { ttl: 3000 });
    })
    .error(function(err) {
      growl.addErrorMessage('Failed to start optimizing ' + path + ' ' + err, { ttl: 3000 });
    });
  };

})
;

