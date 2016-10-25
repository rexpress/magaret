var app = angular.module('app', ['ngRoute']);

app.config(function ($routeProvider) {
	$routeProvider
		.when('/', {
			name: 'tester',
			templateUrl: './views/tester.html',
			controller: 'TesterController'
		})
		.when('/history', {
			name: 'history',
			templateUrl: './views/history.html',
			controller: 'HistoryController'
		})
});

app.run(function ($rootScope) {
	//$rootScope.__dirname = __dirname;

	$rootScope.$on('$routeChangeStart', function (event, next) {
		$rootScope.currentRoute = next;
	});
});




app.controller("HistoryController", function ($scope, $rootScope) {
	
});



