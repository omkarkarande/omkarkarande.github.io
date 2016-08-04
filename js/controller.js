var resumeApp = angular.module('resumeApp', ["ui.bootstrap"]);
resumeApp.controller('resumeCtrl', function($scope, $http) {
    $http.get('res/data/resume.json').success(function(data) {
        $scope.resume_data = data;
        $scope.previous = 0;
    });
});
