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
	$rootScope.historyPanel = false;
	$rootScope.rightVisible = false;

	$rootScope.$on('$routeChangeStart', function (event, next) {
		$rootScope.currentRoute = next;
	});

	$rootScope.openBrowser = (url) => {
		require('electron').shell.openExternal(url);
	};


	$rootScope.showHistory = (e) => {
		$rootScope.historyPanel = true;
	}

	$rootScope.showRight = (e) => {
		$rootScope.rightVisible = true;
		e.stopPropagation();
	}

	$rootScope.close = () => {
		$rootScope.historyPanel = false;
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
	else {
		$scope.envInfo = {};

		Environments.load(function (result) {
			$scope.envInfo = result;
			CacheLib.write('envInfo', result);
		});
	}

	$scope.selectedEnv = null;
	$scope.loadEnv = function (env) {
		$scope.selectedEnv = env;

		// initialize resultSet object
		$scope.resultSet = {};

		// assignment to property value
		$scope.propertyString = {};
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.propertyString[item.name] = {
					content: ''
				};
		}
	};

	for (let init of ['inputText', 'outputText', 'debugText']) {
		$scope[init] = {
			content: ''
		}
	}
});



app.controller("HistoryController", function ($scope, $rootScope) {

});




app.controller("TestingPageController", function ($scope) {
	// On selected Env is changed
	$scope.$watch('selectedEnv', initPropertyData);

	$scope.notice = {
		closeTick: 2000,
		timestamp: 0,
		hide: () => {
			$scope._notice = null;
			$scope.$apply();
			$scope.notice.timestamp = 0;
		},
		info: (msg, t) => {
			$scope._notice = {
				'color': 'blue',
				'text': msg
			};
			var tick = $scope.notice.closeTick;
			$scope.$apply();
			$scope.notice.timestamp = Date.now() + (t ? t : tick);
		},
		err: (msg, t) => {
			$scope._notice = {
				'color': 'red',
				'text': msg
			};
			var tick = $scope.notice.closeTick;
			$scope.$apply();
			$scope.notice.timestamp = Date.now() + (t ? t : tick);
		}
	};

	(function watchNotice() {
		if ($scope.notice.timestamp &&
			$scope.notice.timestamp < Date.now()) {
			$scope.notice.hide();
			$scope.$apply();
		}
		setTimeout(watchNotice, 1000);
	})();

	/**
	 * Init property data
	 *  fill default value etc..
	 */
	function initPropertyData() {
		if (!$scope.selectedEnv) return;

		propertyInput = {};
		for (var prop of $scope.selectedEnv.info.properties) {
			if (prop.value)
				propertyInput[prop.name] = prop.value;
			else if (prop.default !== undefined)
				propertyInput[prop.name] = prop.default;
			else // example placeholder
				propertyInput[prop.name] = prop.example;
		}

		$scope.propertyInput = propertyInput;
		$scope.testSetInput = "";
		$scope.jsonResultSet = null;
		$scope.testResultSet = null;
		$scope.debugOutput = null;
		$scope._notice = null;
		$scope.resultSet = null;
		$scope.result = null;
		$scope.inputText.this.setValue('');
		$scope.outputText.this.setValue('');
		$scope.debugText.this.setValue('');

		for (let p in $scope.propertyString) {
			try {
				$scope.propertyString[p].this.setValue('');
			} catch (e) { }
		}
	}

	$scope.codemirrorLoaded = function (_editor) {
		// Events
		_editor.on("beforeChange", function () { _editor.refresh() });
		_editor.on("change", function () { _editor.refresh() });
	};

	$scope.codemirrorInit = function () {
		for (let a in $scope.propertyString) {
			$scope.propertyString[a].content = $scope.propertyInput[a];
		}
	}

	$scope.testForm = function () {
		for (var p in $scope.propertyString) {
			$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();;
		}

		let env = (() => {
			return {
				image: $scope.selectedEnv.info.docker_image,
				property: $scope.propertyInput,
				testset: $scope.inputText.this.getValue().split('\n'),
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
			if (data.exception)
				resultSet.exception = data.exception;
			// i = res_num
			// j = case_num
			// k = max_column
			// l = alphabet
			// m = max
			let i = 0, j = 0, k = 1, l = 65, m = 0;
			switch (data.type) {
				case 'GROUP':
					{
						resultSet.type = 'group';
						resultSet.columns = data.result.columns;

						for (let a in data.result.resultList) {
							++i;

							if (data.result.resultList[a] === null) {
								resultSet.list.push([i, null]);
								continue;
							}

							j = 0;

							for (let res of data.result.resultList[a].list) {
								resultSet.list.push([(j++ ? ' ' : i), res]);
								if (res.length > k) k = res.length;
							}
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
							resultSet.list.push([env.testset[i++], res]);
						}
						resultSet.columns = ['INPUT', 'RESULT'];
					}
					break;
				case 'MATCH':
					{
						resultSet.type = 'match';
						for (res of data.result.resultList) {
							resultSet.list.push([env.testset[i++], res]);
						}
						resultSet.columns = ['STRING', 'BOOLEAN'];
						break;
					}
				default:
					return resultSet;
			}
			return resultSet;
		});

		mg_docker.exec(env.image, env.property, env.testset, d => {
			switch (d.type) {
				case 'result':
					$scope.resultSet = resultGenerate(d.data);
					$scope.outputText.this.getDoc().setValue(JSON.stringify(d.data));
					if (d.data.debugOutput) $scope.debugText.this.getDoc().setValue(String(d.data.debugOutput).trim());
					if ($scope.resultSet.exception) $scope.notice.err($scope.resultSet.exception, 5000);
					$scope.$apply();
					break;
				case 'log':
					$scope.notice.info(d.data, 5000);
					break;
				case 'end':
					break;
			}
		});
	}


	$scope.resetForm = function () {
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

app.directive('codeMirror', ['$timeout', function ($timeout) {
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
		link: function (scope, element, attrs) {
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
			myCodeMirror.getDoc().setValue(scope.content || '');

			scope.container.this = myCodeMirror;
			myCodeMirror.getGutterElement().style['width'] = '59px'; /* 2.071428571 * 23 + 'px';*/
			myCodeMirror.getGutterElement().style['marginLeft'] = '-5px';

			(function tryRefresh() {
				myCodeMirror.refresh();
				setTimeout(tryRefresh, 100);
			})();

			// word-wrap to codemirror
			scope.$watch('lineWrapping', function (oldValue, newValue) {
				myCodeMirror.setOption('lineWrapping', scope.lineWrapping);
			})

			// Set the codemirror value to the scope
			myCodeMirror.on('change', function (e) {
				$timeout(function () {
					scope.container.content = myCodeMirror.getValue();
				}, 300);
			});

		}
	};
}
]);

/*                */
/* temporary code */
/*                */
app.controller("modalDemo", function ($scope, $rootScope) {
});

app.run(function ($rootScope) {
	document.addEventListener("keyup", function (e) {
		if (e.keyCode === 27)
			$rootScope.$broadcast("escapePressed", e.target);
	});

	document.addEventListener("click", function (e) {
		$rootScope.$broadcast("documentClicked", e.target);
	});
});

app.directive("menu", function () {
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

app.directive("panel", function () {
	return {
		restrict: "E",
		templateUrl: './views/history.html', /* temp */
		transclude: true,
		scope: {
			visible: "=",
			alignment: "@"
		}
	};
});

app.directive("menuItem", function () {
	return {
		restrict: "E",
		template: "<div ng-click='navigate()' ng-transclude></div>",
		transclude: true,
		scope: {
			hash: "@"
		},
		link: function ($scope) {
			$scope.navigate = function () {
				window.location.hash = $scope.hash;
			}
		}
	}
});
