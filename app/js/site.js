var app = angular.module('app', ['ngRoute']);
const {BrowserWindow, ipcMain} = require('electron').remote;

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


app.run(function ($rootScope, GitHubToken) {
	$rootScope.historyPanel = false;
	$rootScope.rightVisible = false;
	$rootScope.shareBoxVisible = false;
	$rootScope.scopeObj = null;

	$rootScope.$on('$routeChangeStart', function (event, next) {
		$rootScope.currentRoute = next;
	});

	$rootScope.openBrowser = (url) => {
		require('electron').shell.openExternal(url);
	};


	$rootScope.showHistory = (e) => {
		$rootScope.historyPanel = true;
		e.stopPropagation();
	}


	var ghToken = GitHubToken.load();
	$rootScope.ghToken = ghToken;


	var init = false;
	ipcMain.on('auth-result', (event, arg) => {
		console.log(arg);
		
		var obj = JSON.parse(arg);

		if (obj.access_token) {
			GitHubToken.save(obj.access_token);
			$rootScope.ghToken = obj.access_token;
			$rootScope.$apply();
			alert('Authorization Successful.');
		}
		else {
			alert('Auth Failed : ' + obj.error);
		}
	});
	
	$rootScope.actLogin = (e) => {
		var win = new BrowserWindow({width: 800, height: 600, webPreferences: {
			preload: require('path').join(__dirname, 'js/authPreload.js'),
			partition: 'auth'
		}})
		win.on('closed', () => {
			win = null;
		});
		
		win.setMenu(null);
		win.loadURL(`https://github.com/login/oauth/authorize?client_id=16756a3f11cc61c1bc5d`)
	}

	$rootScope.actLogout = (e) => {
		GitHubToken.reset();
		alert('Logout Account');
		$rootScope.ghToken = null;
		$rootScope.$apply();
	}

	$rootScope.showRight = (e) => {
		$rootScope.rightVisible = true;
		e.stopPropagation();
	}

	$rootScope.showShareBox = (e) => {
		$rootScope.shareBoxVisible = true;
		e.stopPropagation();
	}

	$rootScope.close = () => {
		$rootScope.historyPanel = false;
		$rootScope.rightVisible = false;
		$rootScope.shareBoxVisible = false;
	}

	$rootScope.$on("documentClicked", _close);
	$rootScope.$on("escapePressed", _close);

	function _close() {
		$rootScope.$apply(() => {
			$rootScope.close();
		});
	}
});



app.controller("TesterController", function ($scope, $rootScope, Environments, CacheLib, GitHubToken) {
	var envInfo = CacheLib.read('envInfo');
	
	$rootScope.scopeObj = $scope;

	$scope.content = '';

	if (envInfo)
		$scope.envInfo = envInfo;
	else {
		$scope.envInfo = {};

		Environments.load(function (result) {
			$scope.envInfo = result;
			CacheLib.write('envInfo', result);
			$scope.$apply();

			console.info($scope.envInfo);
		});
	}

	$scope.selectedEnv = null;

	// initialize resultSet object
	$scope.resultSet = {};

	var loadEnv = function (env) {

		console.log('loadEnv');
		console.log(env);

		if ($scope.selectedEnv) {
			$scope.selectedEnv.save.inputText = $scope.inputText.this.getValue();
			$scope.selectedEnv.save.outputText = $scope.outputText.this.getValue();
			$scope.selectedEnv.save.debugText = $scope.debugText.this.getValue();

			// save to resultSet
			$scope.selectedEnv.save.resultSet = JSON.parse(JSON.stringify($scope.resultSet));

			// process to property string
			for (var p in $scope.propertyString) {
				try {
					$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();
				} catch (e) { }
			}

			for (let p in $scope.propertyInput) {
				try {
					$scope.selectedEnv.save.property[p] = JSON.parse(JSON.stringify($scope.propertyInput[p]));
				} catch (e) { }
			}
		}


		if (env == $scope.selectedEnv)
			return false;

		if (env.save == undefined) {
			env.save = {};
			env.save.property = {};
		}

		$scope.selectedEnv = env;


		// assignment to property value
		$scope.propertyInput = {};
		$scope.propertyString = {};
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.propertyString[item.name] = {
					content: ''
				};
		}
	};

	$scope.loadEnv = loadEnv;

	$scope.$watch('test', function (oldValue, newValue) {
		if (!newValue) return;
		var env = oldValue;
		console.log(loadEnv);
	});


	for (let init of ['inputText', 'outputText', 'debugText']) {
		$scope[init] = {
			content: ''
		}
	}
});



app.controller("HistoryController", function ($scope, $rootScope) {

});




app.controller("TestingPageController", function ($rootScope, $scope, HistoryLib) {
	// On selected Env is changed
	$scope.$watch('selectedEnv', initPropertyData);

	$scope.notice = {
		closeTick: 5000,
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

		for (var prop of $scope.selectedEnv.info.properties) {
			for (let p in $scope.selectedEnv.info.properties) {
					if ($scope.selectedEnv.info.properties[p].name == prop.name) {
						$scope.selectedEnv.info.properties[p].content = $scope.selectedEnv.info.properties[p].example;
						if ($scope.selectedEnv.save.property[prop.name])
							$scope.selectedEnv.info.properties[p].content = $scope.selectedEnv.save.property[prop.name];
					}
			}

			if (prop.value)
				$scope.propertyInput[prop.name] = prop.value;
			else if (prop.default !== undefined)
				$scope.propertyInput[prop.name] = prop.default;
			else // example placeholder
				$scope.propertyInput[prop.name] = prop.example;
		}

		if ($scope.selectedEnv.save.inputText)
			$scope.inputText.this.setValue($scope.selectedEnv.save.inputText);
		else
			$scope.inputText.this.setValue('');
		if ($scope.selectedEnv.save.outputText)
			$scope.outputText.this.setValue($scope.selectedEnv.save.outputText);
		else
			$scope.outputText.this.setValue('');
		if ($scope.selectedEnv.save.debugText)
			$scope.debugText.this.setValue($scope.selectedEnv.save.debugText);
		else
			$scope.debugText.this.setValue('');
		
		if ($scope.selectedEnv.save.resultSet)
			$scope.resultSet = $scope.selectedEnv.save.resultSet;
		else
			$scope.resultSet = null;

		$scope.testSetInput = "";
		$scope.jsonResultSet = null;
		$scope.testResultSet = null;
		$scope.debugOutput = null;
		$scope._notice = null;
		$scope.result = null;

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

	$scope.shareForm = function () {
		$scope.shareBox = true;
	}

	$scope.testForm = function () {
		for (var p in $scope.propertyString) {
			$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();
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
/*
		console.info(env);
		var history = HistoryLib.read();
		if (!history) history = [{}];
		else history = history.data;

		history = history.push(env);
*/
		mg_docker.exec(env.image, env.property, env.testset, d => {
			switch (d.type) {
				case 'result':
					$scope.resultSet = resultGenerate(d.data);
					console.info($scope.resultSet);
					$rootScope.scopeObj.resultSet = JSON.parse(JSON.stringify($scope.resultSet));
					$scope.outputText.this.getDoc().setValue(JSON.stringify(d.data));
					if (d.data.debugOutput) $scope.debugText.this.getDoc().setValue(String(d.data.debugOutput).trim());
					if ($scope.resultSet.exception) $scope.notice.err($scope.resultSet.exception, 15000);
					$scope.$apply();

					// history
					$scope.loadEnv($scope.selectedEnv);
					console.info($scope.selectedEnv);

					var history = HistoryLib.read();
					if (!history) history = [{}];
					else history = history.data;

					history = history.push(env);
					break;
				case 'log':
					$scope.notice.info(d.data, 8000);
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
		},
		controller: ["$scope", "$rootScope", function($scope, $rootScope) {
					//console.log($rootScope.blah);
					//console.log($scope.yah);

					$scope.loadEnv = env => {
						console.info(env);
						$rootScope.test = env;
					}

					$scope.content = [{
						env: 'flume',
						properties: [{
							'name': 'regex',
							'type': 'value',
							'value': '1234'
						}],
						date: Date.now()
					}]

					$scope.test = function(arg) {
							console.log(arg);
					}
			}]
	};
});

app.directive("sharebox", function ($rootScope) {
	return {
		restrict: "E",
		templateUrl: './templates/shareBox.html', /* temp */
		transclude: true,
		scope: {
			visible: "=",
		},
		link: function ($scope) {
			$scope.ignoreEvent = function (e) {
				e.stopPropagation();
			},
			$scope.ignoreKeyEvent = function (e) {
				if (e.keyCode == 13) {
					e.stopPropagation();
					e.preventDefault();
				}
			}
			$scope.submitForm = function (e) {
				if (!$rootScope.ghToken) {
					alert('Require Login');
					return false;
				}
				for (var p in $rootScope.scopeObj.propertyString) {
					$rootScope.scopeObj.propertyInput[p] = $rootScope.scopeObj.propertyString[p].this.getValue();
				}

				let env = (() => {
					return {
						property: $rootScope.scopeObj.propertyInput,
					}
				})();

				var obj = {
					'access_token': $rootScope.ghToken,
					'login_type': 'github',
					'data': {
						'title': $scope.title,
						'description': $scope.description,
						'env': [ ],
						'tags': [ ],
						'properties': { },
						'input': [ ],
						'output': { },
					}
				}

				for (let p in $rootScope.scopeObj.propertyInput) {
					try {
						obj.data.properties[p] = JSON.parse(JSON.stringify($rootScope.scopeObj.propertyInput[p]));
					} catch (e) { }
				}

				obj.data.input = $rootScope.scopeObj.inputText.this.getValue().split('\n');
				obj.data.output = JSON.parse($rootScope.scopeObj.outputText.this.getValue());
				
				obj.data.env = [$rootScope.scopeObj.selectedEnv.parent.name, $rootScope.scopeObj.selectedEnv.name]

				$scope.title = '';
				$scope.description = '';
				$rootScope.shareBoxVisible = false;

				const httpContext = {
					'headers': {
						'User-Agent': 'regular.express Client'
					}
				};

				console.info(obj);

				const request = require('request');
				request({
					url: 'http://auth.regular.express/share',
					//url: 'http://lab.prev.kr:7777/share',
					method: 'POST',
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(obj)
				},
				(err, res, body) => {
					var data;
					try {
						if (res.statusCode == 200) {
							data = JSON.parse(body);
							//window.open(data.url);
						}
						else alert(`Share Failed : ${e.message}`);
					}
					catch (e) {
						console.warn(`SHARING FAILED : ${e.message}`);
					}
					console.info('SHARE COMPLETED : ' + data.url);
				});

				
			}
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
