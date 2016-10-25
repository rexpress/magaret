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
	$rootScope.$on('$routeChangeStart', function (event, next) {
		$rootScope.currentRoute = next;
	});
});



app.controller("TesterController", function ($scope, Environments, CacheLib) {
	var envInfo = CacheLib.read('envInfo');

	if (envInfo)
		$scope.envInfo = envInfo;
	else{
		$scope.envInfo = {};

		Environments.load(function(result) {
			$scope.envInfo = result;
			CacheLib.write('envInfo', result);
		});
	}

	$scope.selectedEnv = null;
	$scope.loadEnv = function(env) {
		$scope.selectedEnv = env;
	};

});



app.controller("HistoryController", function ($scope, $rootScope) {
	
});




app.controller("TestingPageController", function($scope) {
	// On selected Env is changed
	$scope.$watch('selectedEnv', initPropertyData);

	/**
	 * Init property data
	 *  fill default value etc..
	 */
	function initPropertyData() {
		if (!$scope.selectedEnv) return;

		propertyInput = {};
		for (var prop of $scope.selectedEnv.info.properties) {
			if (prop.value)
				propertyInput[ prop.name ] = prop.value;
			else if (prop.default !== undefined)
				propertyInput[ prop.name ] = prop.default;
		}

		$scope.propertyInput = propertyInput;
		$scope.testSetInput = "";
		$scope.testResultSet = null;
		$scope.debugOutput = null;
	}


	$scope.testForm = function() {
		console.log($scope.propertyInput);
		console.log($scope.testSetInput);

		var docker_exec = (run, param, stdout, stderr, end) => {
			const spawn = require('child_process').spawn;
			const ls = spawn(run, param, {
		 		detached: true,
				windowsVerbatimArguments: true
			});

			ls.stdout.on('data', stdout);
			ls.stderr.on('data', stderr);
			ls.on('close', end);
		};

		const docker_image = $scope.selectedEnv.info.docker_image;
		const property = JSON.stringify( $scope.propertyInput );
		const testSet = JSON.stringify( $scope.testSetInput.trim().split('\n') );
		
		docker_exec('docker', ['run', '--rm', '-i', docker_image, property, testSet],
			(data) => {
				var str = data.toString();
				var START_RESULT = '##START_RESULT##';
				var END_RESULT = '##END_RESULT##';

				if (str.substr(START_RESULT) != -1 && str.search(END_RESULT) != -1) {
					str = str.substr( START_RESULT.length );
					str = str.substr( 0, str.search(END_RESULT) );

					var result = JSON.parse(str);

					$scope.testResultSet = JSON.stringify(result.result);
					$scope.debugOutput = result.debugOutput;
					$scope.$apply();
				}
			},
			(data) => {
				console.log('stderr');
				console.info(data.toString());
				$scope.notice = {
					'color': 'blue',
					'text': data.toString()
				}
				$scope.$apply();

				// stderror
		  	},
			(code) => {
				// end
			}
		);
	};

	$scope.resetForm = function() {
		initPropertyData();
	};
})


app.directive("standby", function () {
	return {
		templateUrl: "templates/standby.html"
	};
});

app.directive("testingPage", function () {
	return {
		scope: true,
		templateUrl: "templates/testing.html"
	};
});