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
;

