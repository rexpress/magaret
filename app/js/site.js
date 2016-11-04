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
	$rootScope.rightVisible = false;

	$rootScope.$on('$routeChangeStart', function (event, next) {
		$rootScope.currentRoute = next;
	});

	$rootScope.openBrowser = (url) => {
		require('electron').shell.openExternal(url);
	};

	$rootScope.showRight = (e) => {
		$rootScope.rightVisible = true;
		e.stopPropagation();
	}

	$rootScope.close = () => {
		$rootScope.rightVisible = false;
	}

	$rootScope.$on("documentClicked", _close);
	$rootScope.$on("escapePressed", _close);

	function _close() {
		$rootScope.$apply(() => {
			$rootScope.close();
		});
	}
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
		console.info(env);

		// initialize code mirror object
		$scope.codeMirror = {};

		// assignment to property value
		$scope.property_value = {};
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.property_value[item.name] = {
					content: ''
				};
		}
	};

  $scope.inputText = {
    content: ''
  };

  $scope.outputText = {
    content: ''
  };
	
	$scope.debugText = {
    content: ''
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
			else // example placeholder
				propertyInput[ prop.name ] = prop.example;
		}

		$scope.propertyInput = propertyInput;
		$scope.testSetInput = "";
		$scope.jsonResultSet = null;
		$scope.testResultSet = null;
		$scope.debugOutput = null;
		$scope.notice = null;

	}

	/* not wokring */
	$scope.codemirrorLoaded = function(_editor){
		// Events
		alert('codemirror loaded');
		_editor.on("beforeChange", function(){ _editor.refresh() });
		_editor.on("change", function(){ _editor.refresh() });
	};

	$scope.testForm = function() {
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

		for (let i in $scope.property_value) {
			$scope.propertyInput[i] = $scope.property_value[i].content;
		}

		const docker_image = $scope.selectedEnv.info.docker_image;
		const property = JSON.stringify( $scope.propertyInput );
		const testSet = JSON.stringify( $scope.inputText.content.split('\n') );
		
		var testResult;

		docker_exec('docker', ['run', '--rm', '-i', docker_image, property, testSet],
			(data) => {
				// on stdout data received
				var str = data.toString();
				var START_RESULT = '##START_RESULT##';
				var END_RESULT = '##END_RESULT##';

				if (str.substr(START_RESULT) != -1 && str.search(END_RESULT) != -1) {
					str = str.substr( START_RESULT.length );
					str = str.substr( 0, str.search(END_RESULT) );

					testResult = JSON.parse(str);
					console.log(testResult);


					//$scope.inputText.content = 'teest';
					$scope.outputText.this.getDoc().setValue(JSON.stringify(testResult.result));
					$scope.debugText.this.getDoc().setValue(testResult.debugOutput.trim());

					$scope.testResultSet = JSON.stringify(testResult.result);
					$scope.jsonResultSet = testResult.result;
					$scope.debugOutput = testResult.debugOutput;
					$scope.$apply();

				}
			},
			(data) => {
				// on stderr data received
				$scope.notice = {
					'color': 'blue',
					'text': data.toString()
				};
				$scope.$apply();

		  	},
			(code) => {
				// on end
				if (testResult && testResult.exception) {
					$scope.notice = {
						'color': 'red',
						'text': testResult.exception
					};
					$scope.$apply();

				}else
					$scope.notice = null;
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


// tester

			app.controller("modalDemo", function($scope, $rootScope) {
			});

			app.run(function($rootScope) {
				document.addEventListener("keyup", function(e) {
					if (e.keyCode === 27)
						$rootScope.$broadcast("escapePressed", e.target);
				});
                
                document.addEventListener("click", function(e) {
                    $rootScope.$broadcast("documentClicked", e.target);
                });
			});
			
			app.directive("menu", function() {
				return {
					restrict: "E",
					template: "<div ng-class='{ show: visible, left: alignment === \"left\", right: alignment === \"right\" }' ng-transclude></div>",
					transclude: true,
                    scope: {
                        visible: "=",
                        alignment: "@"
                    }
				};
			});
            
            app.directive("menuItem", function() {
                 return {
                     restrict: "E",
                     template: "<div ng-click='navigate()' ng-transclude></div>",
                     transclude: true,
                     scope: {
                         hash: "@"
                     },
                     link: function($scope) {
                         $scope.navigate = function() {
                             window.location.hash = $scope.hash;
                         }
                     }
                 }
            });




app.directive('codeMirror', ['$timeout', function($timeout) {
  return {
      restrict: 'E',
      replace: true,
      templateUrl: 'templates/codeMirror.html',
      scope: {
        container: '=',
        theme: '@',
        lineNumbers: '@',
				lineWrapping: '@',
				readOnly: '@'
      },
      link: function(scope, element, attrs) {
        var textarea = element.find('textarea')[0];
        var showLineNumbers = scope.lineNumbers === 'true' ? true : false;
        var codeMirrorConfig = {
          lineNumbers: showLineNumbers,
          mode: scope.syntax || 'javascript',
          matchBrackets: true,
          theme: scope.theme || 'default',
          value: scope.content || '',
					lineWrapping: scope.lineWrapping === 'true' ? true : false,
					readOnly: scope.readOnly === 'true' ? true : false,
					tabMode: 'default',
        };
        scope.syntax = 'javascript';
        var myCodeMirror = CodeMirror.fromTextArea(textarea, codeMirrorConfig);

        // If we have content coming from an ajax call or otherwise, asign it
        var unwatch = scope.$watch('container.content', function(oldValue, newValue) {
          if(oldValue !== '') {
            myCodeMirror.setValue(oldValue);
            unwatch();
          }
          else if(oldValue === '' && newValue === '') {
            unwatch();
          }
        });

				scope.container.this = myCodeMirror;

				myCodeMirror.getGutterElement().style['width'] = '59px'; /* 2.071428571 * 23 + 'px';*/
				myCodeMirror.getGutterElement().style['marginLeft'] = '-5px';
				(function tryRefresh() {
					myCodeMirror.refresh();
					if (myCodeMirror.display.cachedTextHeight === null)
						setTimeout(tryRefresh, 100);
				})();
				// var tryRefresh = (() => {
				// 	console.info(myCodeMirror.cachedTextHeight);
				// 	if (typeof myCodeMirror.cachedTextHeight === 'undefined')
				// 	{
				// 		console.log('tick');
				// 		//myCodeMirror.refresh();
				// 		setTimeout(tryRefresh, 500);
				// 	}
					
				// })();
//				setTimeout(function() { console.log(myCodeMirror); myCodeMirror.refresh(); }, 1000);

        // Change the mode (syntax) according to dropdown
        // scope.$watch('syntax', function(oldValue, newValue) {
        //   myCodeMirror.setOption('mode', scope.syntax);
        // });

				// word-wrap to codemirror
				scope.$watch('wordwrap', function(oldValue, newValue) {
					myCodeMirror.setOption('lineWrapping', scope.wordwrap);
				})

        // Set the codemirror value to the scope
        myCodeMirror.on('change', function(e) {
          $timeout(function() {
            scope.container.content = myCodeMirror.getValue();
          }, 300);
        });

      }
    };
  }
]);