/* global angular */
'use strict';
angular
.module('balmung', ['ngRoute','ui.bootstrap'])
.config(function($routeProvider) {

  $routeProvider
  .when('/browse', {
    controller: 'BalmungBrowseCtrl',
    templateUrl: '/template/browse.html'
  })
  .otherwise({
    redirectTo: '/browse'
  })
  ;

})
.value('pixelRatio', window.devicePixelRatio || 1)
.controller('BalmungNavCtrl', function($scope, $element, $rootScope, $location) {

  var items = [{
    link: '#/browse',
    label: 'Browse'
  }/*, {
    link: '#/sprite',
    label: 'Sprite'
  }, {
    link: '#/confirm',
    label: 'Confirmation'
  }*/];
  $scope.items = items;
  $rootScope.$on('$routeChangeSuccess', function() {
    var path = $location.path();
    items.forEach(function(item) {
      if (item.link === '#' + path) {
        $element.find('li').removeClass('active');
        $element.find('a[href="#' + path +'"]').parent().addClass('active');
      }
    });
  });

})
.controller('BalmungBrowseCtrl', function($scope, $http, $routeParams, $location) {

  var dir = $routeParams.dir || '';

  $http
  .post('/api/browse/list', { path: dir })
  .success(function(data) {
    $scope.path = data.path;
    $scope.paths = [];
    var p = '';
    data.path.split('/').forEach(function(name) {
      p += name;
      $scope.paths.push({
        label: name,
        path: p
      });
      p += '/';
    });
    $scope.dirs = data.dirs;
    $scope.files = data.files;
    $scope.ratios = data.ratios;
  })
  .error(function(data, status) {
    // show error on display
    console.error(status, data);
  });

  $scope.selectDir = function(dir) {
    $location.path('browse').search({ dir: dir });
  };

})
;
