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


	$scope.loadEnv = function(env) {
		
	}

});