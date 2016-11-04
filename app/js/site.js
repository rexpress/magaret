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

	$scope.content = '';

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

		// initialize code mirror object
		$scope.codeMirror = {};

		// assignment to property value
		$scope.property_value = {};
		console.info($scope.property_value);
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.property_value[item.name] = {
					content: ''
			};
		}

		// initialize resultset
		$scope.resultSet = {};
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

	$scope.notice = {
		closeTick: 2000,
		hide: () => {
			$scope._notice = null;
			$scope.$apply();
		},
		info: (msg,t) => {
			$scope._notice = {
				'color': 'blue',
				'text': msg
			};
			setTimeout($scope.notice.hide, (typeof t === 'number' ? t : $scope.notice.closeTick));
		},
		err: (msg,t) => {
			$scope._notice = {
				'color': 'red',
				'text': msg
			};
			setTimeout($scope.notice.hide, (typeof t === 'number' ? t : $scope.notice.closeTick));
		}
	};
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
		$scope._notice = null;
		$scope.resultSet = null;

		$scope.inputText.this.getDoc().setValue(''); //err?
		$scope.outputText.this.getDoc().setValue('');
		$scope.debugText.this.getDoc().setValue('');
	}

	$scope.codemirrorLoaded = function(_editor){
		// Events
		_editor.on("beforeChange", function(){ _editor.refresh() });
		_editor.on("change", function(){ _editor.refresh() });
	};

	$scope.codemirrorInit = function() {
		for (let a in $scope.property_value) {
			$scope.property_value[a].content = $scope.propertyInput[a];
		}
	}
	
	$scope.testForm = function() {
		let env = (() => {
			return {
				image: $scope.selectedEnv.info.docker_image,
				property: $scope.propertyInput,
				testset: $scope.inputText.content.split('\n'),
			}
		})();

		let initField = (() => {
			$scope.outputText.this.getDoc().setValue('');
		 	$scope.debugText.this.getDoc().setValue('');
			$scope.resultSet = null;
		})();

		let resultGenerate = (data => {
			var resultSet = {};
			resultSet.list = [];
			// i = res_num
			// j = case_num
			// k = max_column
			// l = alphabet
			// m = max
			let i = 0, j = 0, k = 0, l = 65, m = 0;
			switch(data.type) {
				case 'GROUP':
				{
					resultSet.type = 'group';
					resultSet.columns = data.result.columns;

					for (let a in data.result.resultList) {
						var list = [];
						++i;
						console.log(a);

						if (data.result.resultList[a] === null) {
							list.push(i);
							list.push(null);
							resultSet.list.push(list);
							continue;
						}

						for (let res of data.result.resultList[a].list) {
							list.push((j++ ? '&nbsp' : i));
							list.push(res);
							if (res.length > k) k = res.length;
						}
						resultSet.list.push(list);
					}

					if (!resultSet.columns.length) {
						resultSet.columns = [];
						for (let i = 0; i < k; i++)
							resultSet.columns.push(String.fromCharCode(l++));
					}
				}
				break;
				case 'STRING':
				{
					resultSet.type = 'string';
					let i = 0;
					for (res of data.result.resultList) {
						resultSet.list.push([`${env.testset[i++]}`, `${res}`]);
					}
					resultSet.columns = ['INPUT', 'RESULT'];
				}
				break;
				case 'MATCH':
				{
					resultSet.type = 'match';
					for (res of data.result.resultList) {
						resultSet.list.push([`${env.testset[i++]}`, `${res}`]);
					}
					resultSet.columns = ['STRING', 'BOOLEAN'];
				break;
				}
				default:
					return resultSet;
			}
			console.info(resultSet);
			return resultSet;
		});

		mg_docker.exec(env.image, env.property, env.testset, d => {
			$scope.resultSet = resultGenerate(d.data);
			$scope.outputText.this.getDoc().setValue(JSON.stringify(d.data));
			$scope.debugText.this.getDoc().setValue(String(d.data.debugOutput).trim());
			$scope.$apply();
		});

		// test notice;;
		$scope.notice.info('테스트입니다');
	}

	
	// 	for (let i in $scope.property_value) {
	// 		$scope.propertyInput[i] = $scope.property_value[i].content;
	// 	}

	// 	$scope.outputText.content = '';
	// 	$scope.jsonResultSet = null;
	// 	$scope.jsonResultSet = {};
	// 	resultSet = null;
	// 	resultSet = {};
	// 	$scope.outputText.this.getDoc().setValue('');
	// 	$scope.debugText.this.getDoc().setValue('');

	// 	const docker_image = $scope.selectedEnv.info.docker_image;
	// 	const property = JSON.stringify( $scope.propertyInput );
	// 	const testSet = JSON.stringify( $scope.inputText.content.split('\n') );
	// 	const testSetList = $scope.inputText.content.split('\n');
		
	// 	var testResult;

	// 	console.info('property and testset');
	// 	console.info($scope.propertyInput);
	// 	console.info($scope.inputText.content.split('\n'));

	// 	var buffer = '';
	// 	docker_exec('docker', ['run', '--rm', '-i', docker_image, property, testSet],
	// 		(data) => {
	// 			// on stdout data received
	// 			var str = buffer + data.toString();
	// 			var START_RESULT = '##START_RESULT##';
	// 			var END_RESULT = '##END_RESULT##';

	// 			if (str.substr(START_RESULT) == -1 || str.search(END_RESULT) == -1)
	// 			{
	// 				buffer += str;
	// 				return;
	// 			}

	// 			if (str.substr(START_RESULT) != -1 && str.search(END_RESULT) != -1) {
	// 				buffer = '';
	// 				str = str.substr( str.search(START_RESULT) + START_RESULT.length );
	// 				str = str.substr( 0, str.search(END_RESULT) );

	// 				console.info(str);
	// 				testResult = JSON.parse(str);
	// 				console.log(testResult);


	// 				//$scope.inputText.content = 'teest';
	// 				$scope.outputText.this.getDoc().setValue(JSON.stringify(testResult.result));
					
	// 				console.info(testResult.debugOutput);
	// 				if (typeof testResult.debugOutput !== 'undefined')
	// 					$scope.debugText.this.getDoc().setValue(testResult.debugOutput.trim());

	// 				resultSet = null;
	// 				resultSet = {};

	// 				/* group result generate */
	// 				switch(testResult.type) {
	// 					case 'GROUP':
	// 					{
	// 						resultSet.type = 'group';
	// 						resultSet.columns = testResult.result.columns;

	// 						resultSet.list = null;
	// 						resultSet.list = [];
	// 						let res_num = 0;
	// 						let case_num = 0;
	// 						let max_column = 0;
	// 						for (let r in testResult.result.resultList) {
	// 							var list = [];
	// 							++res_num;

	// 							if (testResult.result.resultList[r] === null) {
	// 								list.push(res_num);
	// 								list.push(null);
	// 								resultSet.list.push(list);
	// 								continue;
	// 							}

	// 							case_num = 0;

	// 							for (let res of testResult.result.resultList[r].list) {
	// 								list.push((case_num++ ? '&nbsp' : res_num));
	// 								list.push(res);
	// 								if (res.length > max_column) max_column = res.length;
	// 							}

	// 							resultSet.list.push(list);
	// 						}

	// 						let alphabet = 65;
	// 						let max = 0;
	// 						if (!resultSet.columns.length) {

	// 							resultSet.columns = [];
	// 							for (let i = 0; i < max_column; i++)
	// 								resultSet.columns.push(String.fromCharCode(alphabet++));
	// 						}

	// 					}
	// 					break;
	// 					case 'STRING':
	// 					{
	// 						resultSet.type = 'string';
	// 						resultSet.list = null;
	// 						resultSet.list = [];
	// 						let res_num = 0;
	// 						for (res of testResult.result.resultList) {
	// 							var list = [];
	// 							list.push(testSetList[res_num++]);
	// 							list.push(res);
	// 							resultSet.list.push(list);
	// 						}
	// 						resultSet.columns = ['INPUT', 'RESULT'];
	// 					}
	// 					break;
	// 					case 'MATCH':
	// 					{
	// 						resultSet.type = 'match';
	// 						resultSet.list = null;
	// 						resultSet.list = [];
	// 						let res_num = 0;
	// 						for (res of testResult.result.resultList) {
	// 							var list = [];
	// 							list.push(testSetList[res_num++]);
	// 							list.push(res);
	// 							resultSet.list.push(list);
	// 						}
	// 						resultSet.columns = ['STRING', 'BOOLEAN'];
	// 					break;
	// 					}
	// 				}
	// 				console.info(resultSet);

	// 				$scope.testResultSet = JSON.stringify(testResult.result);
	// 				$scope.jsonResultSet = testResult.result;
	// 				$scope.debugOutput = testResult.debugOutput;

	// 				$scope.$apply();

	// 			}
	// 		},
	// 		(data) => {
	// 			// on stderr data received
	// 			$scope.notice = {
	// 				'color': 'blue',
	// 				'text': data.toString()
	// 			};
	// 			$scope.$apply();

	// 	  	},
	// 		(code) => {
	// 			// on end
	// 			if (testResult && testResult.exception) {
	// 				$scope.notice = {
	// 					'color': 'red',
	// 					'text': testResult.exception
	// 				};
	// 				$scope.$apply();

	// 			}else
	// 				$scope.notice = null;
	// 		}
	// 	);
	// };

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
				readOnly: '@',
				content: '@',
      },
      link: function(scope, element, attrs) {
		console.log(scope.$root);
        var textarea = element.find('textarea')[0];
        var showLineNumbers = scope.lineNumbers === 'true' ? true : false;
        var codeMirrorConfig = {
          lineNumbers: showLineNumbers,
          mode: scope.syntax || 'javascript',
          matchBrackets: true,
          theme: scope.theme || 'default',
          value: scope.content || 'asdfa',
					lineWrapping: scope.lineWrapping === 'true' ? true : false,
					readOnly: scope.readOnly === 'true' ? true : false,
					tabMode: 'default',
					/*inputStyle: 'textarea'*/
        };
        scope.syntax = 'javascript';
        var myCodeMirror = CodeMirror.fromTextArea(textarea, codeMirrorConfig);

        // If we have content coming from an ajax call or otherwise, asign it
        // var unwatch = scope.$watch('container.content', function(oldValue, newValue) {
				// 	console.info(`scope.watch - ${oldValue} ${newValue}`)
        //   if(oldValue !== '') {
        //     myCodeMirror.setValue(oldValue);
				// 		//myCodeMirror.refresh();
        //     unwatch();
        //   }
        //   else if(oldValue === '' && newValue === '') {
        //     //unwatch();
        //   }
        // });

				scope.container.this = myCodeMirror;

				myCodeMirror.getGutterElement().style['width'] = '59px'; /* 2.071428571 * 23 + 'px';*/
				myCodeMirror.getGutterElement().style['marginLeft'] = '-5px';

				
				(function tryRefresh() {
					myCodeMirror.refresh();
					// $scope.codemirrorLoaded(myCodeMirror);
					
						setTimeout(tryRefresh, 100);
					/*
					if (myCodeMirror.display.cachedTextHeight === null)
						setTimeout(tryRefresh, 100);
					else {
						scope.$parent.codemirrorInit();
					}*/
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
				scope.$watch('lineWrapping', function(oldValue, newValue) {
					myCodeMirror.setOption('lineWrapping', scope.lineWrapping);
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