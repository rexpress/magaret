var app = angular.module('app', ['ngRoute', 'ngMaterial']);
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


app.run(function ($rootScope, GitHubToken, HistoryLib) {
	$rootScope.historyPanel = false;
	$rootScope.rightVisible = false;
	$rootScope.shareBoxVisible = false;
	$rootScope.scopeObj = null;
	$rootScope.imageInfo = {};
	$rootScope.historyContent = HistoryLib.read();

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


	var tokenObj = GitHubToken.load();
	if (!tokenObj)
		tokenObj = {};
	$rootScope.ghToken = tokenObj.access_token;
	$rootScope.ghPropic = tokenObj.avatar_url;
	$rootScope.ghName = tokenObj.name;

	$rootScope.actLogin = (e) => {
		var once = false;
		ipcMain.once('auth-result', (event, arg) => {
			if (once) return false;
			var obj = JSON.parse(arg);

			once = true;
			if (obj.access_token) {
				GitHubToken.save(obj.access_token);
				alert('Authorization Successful.');
			}
			else {
				alert('Auth Failed : ' + obj.error);
			}
		});
		let win = new BrowserWindow({width: 800, height: 600, webPreferences: {
			preload: require('path').join(__dirname, 'js/authPreload.js'),
			partition: 'auth' + Date.now().toString()
		}})
		
		win.setMenu(null);
		win.loadURL(`https://github.com/login/oauth/authorize?client_id=16756a3f11cc61c1bc5d`)
	}

	$rootScope.actLogout = (e) => {
		GitHubToken.reset();
		alert('Logout Account');
		$rootScope.ghToken = null;
	}

	$rootScope.showRight = (e) => {
		$rootScope.rightVisible = true;
		e.stopPropagation();
	}

	$rootScope.showShareBox = (e) => {
		if (!$rootScope.ghToken) {
			alert('Require Login');
			return false;
		}
		$rootScope.shareBoxVisible = true;
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

app.controller("TesterController", function ($scope, $rootScope, Environments, CacheLib, GitHubToken) {
	var envInfo = CacheLib.read('envInfo');

	$rootScope.scopeObj = $scope;

	$scope.content = '';

	if (envInfo)
		$scope.envInfo = envInfo;
	else {
		$scope.envInfo = {};

		var getUnique = function(el){
			var u = {}, a = [];
			for(var i = 0, l = el.length; i < l; ++i){
					if(u.hasOwnProperty(el[i])) {
						continue;
					}
					a.push(el[i]);
					u[el[i]] = 1;
			}
			return a;
		}

		Environments.load(function (result) {
			$scope.envInfo = result;
			CacheLib.write('envInfo', result);

			var array = [];
			for (let p in $scope.envInfo)
				for (let c in $scope.envInfo[p].children) {
					array.push($scope.envInfo[p].children[c].info.docker_image);
				}
			array = getUnique(array);
			for (let arr of array) {
				$rootScope.imageInfo[arr] = [0];
			}
			for (let arr of array) {
				/*if (!arr.search(':'))
					continue;
				let s = arr.split(':');
				getImageInspect(s[0], s[1], (ph, result) => {
					console.log(`${arr} ${result}`);
				})*/
				testImage(arr, (result) => {
					// 0 : installed
					// 1 : not installed
					// 2 : need update
					$rootScope.imageInfo[arr][0] = 0;
					if (!result[1])
						$rootScope.imageInfo[arr][0] = 1;
					else if (result[0] != result[1])
						$rootScope.imageInfo[arr][0] = 2;
				});


				for (let p in $scope.envInfo)
					for (let c in $scope.envInfo[p].children) {
						$scope.envInfo[p].children[c].image = $rootScope.imageInfo[$scope.envInfo[p].children[c].info.docker_image];
					}
			}
			$scope.$apply();
		});
	}

	$scope.selectedEnv = null;

	// initialize resultSet object
	$scope.resultSet = {};

	var loadEnv = function (env, isHistory) {
		if (isHistory)
			$scope.selectedEnv.isHistory = true;
			
		if ($scope.selectedEnv && $scope.selectedEnv.name != env.name) { 
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
/*
		if (!isHistory && $scope.selectedEnv)
			return false;
*/
console.log($rootScope.scopeObj.propertyInput);
		if ($scope.selectedEnv && env.name == $scope.selectedEnv.name) {
			for (let p in $scope.propertyString) {
				try {
					console.log($scope.propertyString[p].this.setValue(Date.now().toString()));
				} catch(e) { }
			}
		}

		console.info(env);
		if (env.save == undefined) {
			env.save = {};
			env.save.property = {};
			env.result = {};
			env.result.properties = {};
		}
		var isFound = false;
		// restore history property and input/output
		if (isHistory) {
			$scope.selectedEnv = null;
			for (let p in $scope.envInfo) {
				for (let c in $scope.envInfo[p].children) {
					if (isFound) break;
					if ($scope.envInfo[p].children[c].name == env.name) {
						if (!$scope.envInfo[p].children[c].save)
							$scope.envInfo[p].children[c].save = {};
						console.log(env.result.output.debugOutput);
						$scope.envInfo[p].children[c].save.inputText = JSON.parse(JSON.stringify(env.result.input.join('\n')));
						$scope.envInfo[p].children[c].save.outputText = JSON.stringify(env.result.output);
						$scope.envInfo[p].children[c].save.debugText = env.result.output.debugOutput;
						$scope.envInfo[p].children[c].save.resultSet = JSON.parse(JSON.stringify(env.result.resultSet));
						$scope.envInfo[p].children[c].save.property = JSON.parse(JSON.stringify(env.result.properties));
						console.log($scope.envInfo[p].children[c].save.property);
						$scope.resultSet = $scope.envInfo[p].children[c].save.resultSet;
						$scope.selectedEnv = $scope.envInfo[p].children[c];
						$scope.propertyInput = env.result.properties;
						
						$rootScope.initPropertyData();
						console.log($scope.propertyInput);
						console.log($scope.propertyString);
						isFound = true;
					}
				}
			}
			if (!isFound) {
				$scope.selectedEnv = env;
			}
		} else $scope.selectedEnv = env;

		// assignment to property value
		if (!$scope.propertyInput) $scope.propertyInput = {};
		if (!$scope.propertyString) $scope.propertyString = {};
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.propertyString[item.name] = {
					content: ''
				};
		}
	};

	$scope.loadEnv = loadEnv;

	$scope.loadEnv({
		"name": "test-env",
		"parent": {
			"name": "test",
			"info": {
				"description": "Test Environment",
				"website": "https://placeholder/",
				"icon": {
					"type": "devicon",
					"value": "test"
				},
				"title": "TestEnv"
			}
		},
		"info": {
			"properties": [{
				"type": "string",
				"help": "Regex string.",
				"name": "input.regex",
				"example": "(0[0-9]{2})-([0-9]{3,4})-([0-9]{3,4})",
				"required": true,
				"content": "(0[0-9]{2})-([0-9]{3,4})-([0-9]{3,4})",
				"$$hashKey": "object:115"
			}, {
				"type": "string",
				"help": "Whitepsace seperated column list.",
				"name": "columns",
				"example": "A,B,C",
				"required": true,
				"content": "A,B,C",
				"$$hashKey": "object:116"
			}, {
				"type": "string",
				"help": "Comma seperated column type list.",
				"name": "columns.types",
				"example": "STRING,STRING,STRING",
				"required": true,
				"content": "STRING,STRING,STRING",
				"$$hashKey": "object:117"
			}, {
				"type": "boolean",
				"help": "Determine regex case insensitive.",
				"name": "input.regex.case.insensitive",
				"default": false,
				"example": "",
				"required": false,
				"content": "",
				"$$hashKey": "object:118"
			}, {
				"name": "Test Type",
				"type": "list",
				"list" : {
					"a" : "Type A",
					"b" : "Type B"
				},
				"default": "a",
				"example": "",
				"help" : "Type."
			}, {
				"name": "Food",
				"type": "list",
				"list" : {
					"c" : "Chicken",
					"p" : "Pizza",
					"r" : "Ramen",
					"s" : "Sushi",
				},
				"default": "r",
				"example": "",
				"help" : "Type."
			}],
			"description": "Testing purpose environment",
			"docker_image": "",
			"author": "regular.express",
			"title": "Test Select"
		},
		"displayName": "TestEnv",
		"image": [0],
		"save": {
			"property": {}
		},
		"result": {
			"properties": {}
		}
	})

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
	$rootScope.initPropertyData = initPropertyData;
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
	function initPropertyData(hardReset) {
		console.info('called initPropertyData function');
		if (!$scope.selectedEnv) return;
		console.log($scope.propertyString);

		var isHistory = $scope.selectedEnv.isHistory;
		if (isHistory) $scope.selectedEnv.isHistory = null;

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
		else if ($scope.inputText.this)
				$scope.inputText.this.setValue('');
		if ($scope.selectedEnv.save.outputText)
			$scope.outputText.this.setValue($scope.selectedEnv.save.outputText);
		else if ($scope.outputText.this)
				$scope.outputText.this.setValue('');
		if ($scope.selectedEnv.save.debugText)
			$scope.debugText.this.setValue($scope.selectedEnv.save.debugText);
		else if ($scope.debugText.this)
				$scope.debugText.this.setValue('');

		if (!isHistory) {
			if ($scope.selectedEnv.save.resultSet)
				$scope.resultSet = $scope.selectedEnv.save.resultSet;
			else
				$scope.resultSet = null;
		} else {
			$scope.resultSet = $scope.selectedEnv.save.resultSet;
		}

		$scope.testSetInput = "";
		$scope.jsonResultSet = null;
		$scope.testResultSet = null;
		$scope.debugOutput = null;
		$scope._notice = null;
		$scope.result = null;

		// for (let p in $scope.propertyString) {
		// 	try {
		// 			$scope.propertyString[p].this.setValue('');
		// 	} catch (e) {console.error(e) }
		// }
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

	$scope.updateForm = function () {
		const async = require('async');
		let env = (() => {
			return {
				image: $scope.selectedEnv.info.docker_image,
			}
		})();
		async.waterfall([
			function (callback) {
				mg_docker.pull(env.image, d => {
					switch (d.type) {
						case 'log':
							$scope.notice.info(d.data, 8000);
						break;
						default:
						console.info(d.data);
							if (d.data == 0)
								callback(null);
						break;
					}
				});
			},
			function (callback) {
				testImage(env.image, (result) => {
					$scope.selectedEnv.image[0] = 0;
					if (!result[1])
						$scope.selectedEnv.image[0] = 1;
					else if (result[0] != result[1])
						$scope.selectedEnv.image[0] = 2;
					
					if (!$scope.selectedEnv.image[0]) {
						$scope.$apply();
						callback(null);
					}
				});
			},
			function (callback) {
				$scope.testForm();
			}
		])
	}

	$scope.testForm = function () {
		for (var p in $scope.propertyString) {
			try {
				$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();
				console.log(`${p}: ${$scope.propertyInput[p]}`)
			} catch (e) { }
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
					$rootScope.scopeObj.resultSet = JSON.parse(JSON.stringify($scope.resultSet));
					$scope.outputText.this.getDoc().setValue(JSON.stringify(d.data));
					if (d.data.debugOutput) $scope.debugText.this.getDoc().setValue(String(d.data.debugOutput).trim());
					if ($scope.resultSet.exception) $scope.notice.err($scope.resultSet.exception, 15000);
					$scope.$apply();

					$scope.selectedEnv.result = {};
					$scope.selectedEnv.result.resultSet = {};

					// history
					for (var p in $scope.propertyString) {
						try {
							$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();
						} catch(e) { }
					}

					for (let p in $scope.propertyInput) {
						try {
							$scope.selectedEnv.result.properties[p] = JSON.parse(JSON.stringify($scope.propertyInput[p]));
						} catch (e) { }
					}
					if (!$scope.resultSet) 
						$scope.resultSet = {};	
					
					$scope.selectedEnv.result.resultSet = JSON.parse(JSON.stringify($scope.resultSet));
					$scope.selectedEnv.result.input = $scope.inputText.this.getValue().split('\n');
					$scope.selectedEnv.result.output = JSON.parse($scope.outputText.this.getValue());
					$scope.selectedEnv.result.env = [$scope.selectedEnv.parent.name, $scope.selectedEnv.name];
					$scope.selectedEnv.result.properties = JSON.parse(JSON.stringify($scope.propertyInput));
					$scope.selectedEnv.result.timestamp = Date.now();

					var hist = HistoryLib.read();
					if (!hist) hist = [{}];

					hist.unshift($scope.selectedEnv);
					HistoryLib.write(hist);
					$rootScope.historyContent = HistoryLib.read();
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
		initPropertyData(true);
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

app.directive("panel", function (HistoryLib) {
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
					$scope.historyContent = () => {
						return $rootScope.historyContent; 
					}

					$rootScope.$watch('historyPanel', function() {
							//scrollTo(scrollElement);
							hist_content.scrollTop = 0;
					});
						$scope.test = () => {
							return true;
						}


					$scope.loadEnv = env => {
						$rootScope.scopeObj.loadEnv(env, true);
					}

					$scope.test = function(arg) {
							console.log(arg);
					}
			}]
	};
});

app.directive("sharebox", function ($rootScope, $timeout) {
	return {
		restrict: "E",
		templateUrl: './templates/shareBox.html', /* temp */
		transclude: true,
		scope: {
			visible: "="
		},
		link: function ($scope) {
			$scope.tags = [];
			$scope.shareStep = 0;
			$scope.shareMsg = '';
			$scope.shareURL = '';
			$scope.openBrowser = $rootScope.openBrowser;
			$scope.closeBox = function (e) {
				$rootScope.shareBoxVisible = false;
				$scope.title = '';
				$scope.description = '';
				$scope.shareStep = 0;
				$scope.tags = [];
			}
			$scope.ignoreEvent = function (e) {
				e.stopPropagation();
			},
			$scope.ignoreKeyEvent = function (e) {
				if (e.keyCode == 13) {
					e.stopPropagation();
					e.preventDefault();
				}
			}
			$scope.copyURL = function (e) {
				require('electron').clipboard.writeText($scope.shareURL);
			}
			$scope.submitForm = function (e) {
				if (!$rootScope.ghToken) {
					$scope.shareStep = 1;
					$scope.shareMsg = 'Require login token.';
					return false;
				}
				if (!$scope.title) {
					$scope.shareStep = 1;
					$scope.shareMsg = 'Title field is required.';
					return false;
				}
				$scope.shareStep = 2;
				var result = $rootScope.scopeObj.selectedEnv.result;

				let env = (() => {
					return {
						property: $rootScope.scopeObj.propertyInput,
					}
				})();

				var obj = {
					'access_token': $rootScope.ghToken,
					'login_type': 'github',
					'data': {
						'title': '',
						'description': '',
						'env': [ ],
						'tags': [ ],
						'properties': { },
						'input': [ ],
						'output': { },
					}
				}

				if (!result || !result.output) {
						$scope.shareStep = 1;
						$scope.shareMsg = 'Result not found.';
						return false;
				}

				obj.data = JSON.parse(JSON.stringify(result));
				obj.data.title = $scope.title;
				obj.data.description = $scope.description;
				obj.data.tags = $scope.tags;

				const httpContext = {
					'headers': {
						'User-Agent': 'regular.express Client'
					}
				};

				console.info(`Share Request >> ${JSON.stringify(obj)}`);

				const request = require('request');
				request({
					url: 'http://auth.regular.express/share',
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
							$scope.shareStep = 3;
							$scope.shareURL = data.url; // temp
							console.info('SHARE COMPLETED : ' + data.url);
						}
						else {
							$scope.shareStep = 1;
							$scope.shareMsg = `[${res.statusCode}] Server Error`;
							console.warn(body);
							console.info(`Share Failed : Server Error ${res.statusCode}.`);
						}
					}
					catch (e) {
						$scope.shareStep = 1;
						$scope.ShareMsg = 'Unexpected Error.';
						console.warn(e);
						console.warn(`SHARING FAILED : ${e.message}`);
					}

					$scope.$apply();
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
