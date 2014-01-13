/* global angular */
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
.service('optimizeService', function($http) {

  return {
  };

})
;

