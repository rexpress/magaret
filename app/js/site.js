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
	$rootScope.magaret_phase = 1;
	$rootScope.magaret_loadstr = '';
	$rootScope.addLoadStr = (str) => {
		if ($rootScope.magaret_loadstr)
			$rootScope.magaret_loadstr += '\n';
		$rootScope.magaret_loadstr += str;
		if (typeof magaret_loadstr !== 'undefined') {
			magaret_loadstr.value = $rootScope.magaret_loadstr;
			magaret_loadstr.scrollTop = magaret_loadstr.scrollHeight;
		}
	}
	$rootScope.clearLoadStr = (str) => {
		$rootScope.magaret_loadstr = '';
	}

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

app.controller("TesterController", function ($scope, $rootScope, Environments, CacheLib, GitHubToken, ConfigLib) {
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
			const async = require('async');
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

			async.each(array, function (arr, callback) {
				testImage(arr, (result) => {
					$rootScope.imageInfo[arr][0] = 0;
					if (!result[1])
						$rootScope.imageInfo[arr][0] = 1;
					else if (result[0] != result[1])
						$rootScope.imageInfo[arr][0] = 2;
					
					callback();
				})
			},
			// done
			function (err) {
				for (let p in $scope.envInfo) {
					for (let c in $scope.envInfo[p].children) {
						$scope.envInfo[p].children[c].image = $rootScope.imageInfo[$scope.envInfo[p].children[c].info.docker_image];
					}
				}
				$rootScope.magaret_phase = 0;
				$scope.$apply();
			});
		});
	}

	var config = ConfigLib.load();
	if (!config)
		$scope.advMode = true;
	else
		$scope.advMode = config.advMode;
	$scope.selectedEnv = null;
	
	// initialize resultSet object
	$scope.resultSet = {};

	var loadHistory = function (history) {
		let env;
		for (let p in $scope.envInfo) {
			for (let c in $scope.envInfo[p].children) {
				if ($scope.envInfo[p].children[c].name == history.name) {
					env = $scope.envInfo[p].children[c]; 
				}
			}
		}
		if (!env) {
			console.error("can't load history");
			return;
		}

		loadEnv(env);
		//$scope.selectedEnv = env;
		//setEnvCollection(env);
		
		// restore value
		for (let p in history.result.properties) {
			$scope.envValue.properties[p]._value = history.result.properties[p].value; 
			$scope.envValue.properties[p].setValue(history.result.properties[p].value);
		}

		console.error('history:');
		console.error(history);

		console.info(history.result['input'].join('\n'));
		$scope.envValue.field['input']._value = history.result['input'].join('\n');
		$scope.envValue.field['input'].setValue($scope.envValue.field['input']._value);

		if (history.result['output'])
			$scope.envValue.field['output']._value = JSON.stringify(history.result['output']);
		else
			$scope.envValue.field['output']._value = '';
		$scope.envValue.field['output'].setValue($scope.envValue.field['output']._value);

		if (history.result['output'] && history.result['output'].debugOutput)
			$scope.envValue.field['debug']._value = history.result['output'].debugOutput;
		else
			$scope.envValue.field['debug']._value = '';
		$scope.envValue.field['debug'].setValue($scope.envValue.field['debug']._value);

		$scope.envValue.resultSet = JSON.parse(JSON.stringify(history.result.resultSet));

		console.log('loadHistory -- ');

	}

	$scope.loadHistory = loadHistory;

	var setEnvCollection = function (env) {
		if (!$scope.fieldInfo) {
			$scope.fieldInfo = {};
			for (let i of ['input', 'output', 'debug']) {
					$scope.fieldInfo[i] = {
						_value: '',
						getValue: function () {
							return this._value;
						},
						setValue: function (val) {
							this._value = val;
						}
					}
				}
		}

		// create envCollection
		if (!$scope.envCollection[env.name]) {
			console.info(`Create envCollection: ${env.name}`);
			$scope.envValue = {
				properties: {},
				field: {},
				resultSet: {}
			};

			// reference to fieldInfo
			for (let i of ['input', 'output', 'debug']) {
				$scope.envValue.field[i] = {
					getValue: function () {
						return $scope.fieldInfo[i].getValue();
					},
					setValue: function (val) {
						return $scope.fieldInfo[i].setValue(val);
					},
					save: {}
				}
			}

			console.info($scope.envValue);

			for (let item of ['input', 'output', 'debug']) {
				$scope.envValue.field[item].save = '';
				$scope.envValue.field[item].setValue('');
			};

			for (let item of env.info.properties) {

				switch(item.type) {
					case 'string':
					case 'number':
					case 'boolean':
					case 'list':
					case 'hidden':
						$scope.envValue.properties[item.name] = { };
						$scope.envValue.properties[item.name] = {
							type: item.type,
							example: item.example || '',
							required: item.required,
							important: item.important,
							default: item.default || item.value || item.example,
							_value: item.default || item.value ||item.example || '',
							getValue: function() {
								return this._value;
							},
							setValue: function(val) {
								this._value = val;
							}
						}
					break;
				}
			}
			$scope.envCollection[env.name] = $scope.envValue;
		}
		else $scope.envValue = $scope.envCollection[env.name];
	}

	var loadEnv = function (env) {
		let oldEnv = $scope.selectedEnv;
		console.warn($scope.envCollection);

		if ($scope.envValue) {
			console.log($scope.envValue.field.input.getValue());
			$scope.envValue.field.input.save = $scope.envValue.field.input.getValue();
			$scope.envValue.field.output.save = $scope.envValue.field.output.getValue();
			$scope.envValue.field.debug.save = $scope.envValue.field.debug.getValue();
			console.warn($scope.envValue);
		}
		
		console.info(env);
		if (env.save == undefined) {
			env.save = {};
			env.save.property = {};
			env.result = {};
			env.result.properties = {};
		}
		var isFound = false;
		$scope.selectedEnv = env;
		console.warn($scope.envCollection);

		setEnvCollection(env);

		// All Properties and Input check, all empty, fill to default value
		var checkIsAllEmpty = () => {
			for (let p in $scope.envValue.properties) {
				if ($scope.envValue.properties[p].getValue()) {
					return false;
				}
			}
			for (let i of ['input', 'output', 'debug']) {
				if ($scope.envValue.field[i].getValue()) {
					return false;
				}
			}
			return true;
		}

		if (checkIsAllEmpty()) {
			for (let p in $scope.envValue.properties) {
				scope.envValue.properties[p]._value = $scope.envValue.properties[p].default;
				scope.envValue.properties[p].setValue($scope.envValue.properties[p].default);
				return false;
			}
		}
		console.log($scope.envValue);
		//console.warn($scope.envValue);
		// assignment to property value
		$scope.propertyInput = {};
		$scope.propertyString = {};
		for (let item of env.info.properties) {
			if (item.type == 'string')
				$scope.propertyString[item.name] = {
					content: ''
				};
		}

		// assignment to save value
		for (let i of ['input', 'output', 'debug']) {
				$scope.envValue.field[i].setValue($scope.envValue.field[i].save);
		}
	};

	$scope.loadEnv = loadEnv;
	$scope.envCollection = {};
	console.log($scope.envCollection);

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




app.controller("TestingPageController", function ($rootScope, $scope, HistoryLib, ConfigLib) {
	// On selected Env is changed
	$rootScope.initPropertyData = initPropertyData;
	$scope.one = 1;
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

		// Press Reset Button
		if (hardReset == true) {
			for (let el of ['input', 'output', 'debug']) {
				$scope.envValue.field[el].setValue('');
			}
			for (let p in $scope.envValue.properties) {
				$scope.envValue.properties[p].setValue('');
			}
			return;
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
/*
		if (!isHistory) {
			if ($scope.selectedEnv.save.resultSet)
				$scope.resultSet = $scope.selectedEnv.save.resultSet;
			else
				$scope.resultSet = null;
		} else {
			$scope.resultSet = $scope.selectedEnv.save.resultSet;
		}
*/
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

		var redirected = (!!$rootScope.magaret_phase);

		if (!redirected) {
			$rootScope.magaret_phase = 2;
			$rootScope.clearLoadStr();
		}
		$rootScope.addLoadStr('pull image ' + env.image);
		
		if (redirected) {
			$scope.$apply();
		}

		async.waterfall([
			function (callback) {
				mg_docker.pull(env.image, d => {
					switch (d.type) {
						case 'log':
							$rootScope.addLoadStr(d.data);
							$scope.notice.info(d.data, 8000);
						break;
						case 'error':
							$rootScope.magaret_phase = 0;
							$scope.notice.err(d.data, 8000);
						break;
						default:
						console.info(d.data);
							//if (d.data == 0) // 0 == normally terminated
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
						callback(null);
					} else {
						$scope.notice.err('docker pull failed', 8000);
						$rootScope.magaret_phase = 0;
						$scope.$apply();
					}
				});
			},
			function (callback) {
				$scope.testForm(null, true); // redirected
			}
		])
	}

	$scope.saveAdvMode = function (e) {
		ConfigLib.save({'advMode': $scope.advMode});
	}

	$scope.testForm = function (e, redirected) {
		const async = require('async');

		if (!$rootScope.magaret_phase) {
			$rootScope.magaret_phase = 2;
			$rootScope.clearLoadStr();
		}

		let env = (() => {
			return {
				image: $scope.selectedEnv.info.docker_image,
				property: {},
				testset: $scope.envValue.field.input.getValue().split('\n'),
			}
		})();

    let s = env.image.split(':');
    let image = s[0];
    let tag = s[1];
		async.waterfall([
			function (callback) {
				// check if exist image
				getImageInspect(image, tag, (ph, result) => {
					if (typeof result != 'string') {
						if (redirected) {
							$rootScope.magaret_phase = 0;
							$scope.$apply();
							return $scope.notice.err('docker pull failed #2', 8000);
						}
						else return $scope.updateForm();
					}
					callback(null);
				});
			},
			function (callback) {
				$rootScope.addLoadStr('Request Docker.');
				for (var p in $scope.propertyString) {
					try {
						$scope.propertyInput[p] = $scope.propertyString[p].this.getValue();
						//console.log(`${p}: ${$scope.propertyInput[p]}`)
					} catch (e) { }
				}

				console.log(env.testset);
				console.log($scope.envValue.properties);
				for (let p in $scope.envValue.properties) {
					env.property[p] = $scope.envValue.properties[p].getValue();	
				}

				let initField = (() => {
					$scope.envValue.field.output.setValue('');
					$scope.envValue.field.debug.setValue('');
					$scope.envValue.resultSet = null;
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

								if (!resultSet.columns || !resultSet.columns.length) {
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
							// generate and print resultset
							$scope.envValue.resultSet = resultGenerate(d.data);
							$rootScope.scopeObj.resultSet = JSON.parse(JSON.stringify($scope.resultSet));

							// output
							$scope.envValue.field.output.setValue(JSON.stringify(d.data));
							$scope.envValue.field.output._value = $scope.envValue.field.output.getValue();

							// debugoutput
							if (d.data.debugOutput) $scope.envValue.field.debug.setValue(String(d.data.debugOutput).trim());
							$scope.envValue.field.debug._value = $scope.envValue.field.debug.getValue();

							if ($scope.resultSet.exception) $scope.notice.err($scope.resultSet.exception, 15000);
							$scope.$apply();

							$scope.selectedEnv.result = {};
							$scope.selectedEnv.result.resultSet = {};

							if (!$scope.resultSet) 
								$scope.resultSet = {};	
							
							$scope.selectedEnv.result.resultSet = JSON.parse(JSON.stringify($scope.envValue.resultSet));
							$scope.selectedEnv.result.input = $scope.envValue.field.input.getValue().split('\n');
							$scope.selectedEnv.result.output = JSON.parse($scope.envValue.field.output.getValue());
							$scope.selectedEnv.result.env = [$scope.selectedEnv.parent.name, $scope.selectedEnv.name];
							$scope.selectedEnv.result.timestamp = Date.now();
							$scope.selectedEnv.result.properties = {};

							// history
							for (var p in $scope.envValue.properties) {
								try {
									$scope.selectedEnv.result.properties[p] = {
										value: $scope.envValue.properties[p].getValue(),
										important: $scope.envValue.properties[p].important
									}
								} catch(e) { }
							}

							var hist = HistoryLib.read();
							if (!hist) hist = [{}];
							console.warn(JSON.parse(JSON.stringify($scope.selectedEnv)));

							hist.unshift($scope.selectedEnv);
							HistoryLib.write(hist);
							$rootScope.historyContent = HistoryLib.read();
							break;
						case 'log':
							$rootScope.addLoadStr(d.data);
							$scope.notice.info(d.data, 8000);
							$scope.$apply();
							break;
						case 'end':
							$rootScope.magaret_phase = 0;
							$scope.$apply();
							break;
					}
				});
			}
		])
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
				smartIndent: false,
				theme: scope.theme || 'default',
				lineWrapping: scope.lineWrapping === 'true' ? true : false,
				readOnly: scope.readOnly === 'true' ? true : false,
				tabMode: 'default',
			};

			scope.syntax = 'javascript';
			var myCodeMirror = CodeMirror.fromTextArea(textarea, codeMirrorConfig);
			scope.container.codemirror = true;
			myCodeMirror.setValue(scope.container.getValue());

			//scope.container.this = myCodeMirror;
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
/*
			scope.$watch('container.save', function(newValue, oldValue){
					console.log('save changed');
			}, true);
*/

			for (let i of ['getValue', 'setValue']) {
				scope.container[i] = function (val) {
					return myCodeMirror[i](val);
				}
			}
/*
			// Set the codemirror value to the scope
			myCodeMirror.on('change', function (e) {
				$timeout(function () {
					scope.container.content = myCodeMirror.getValue();
				}, 300);
			});
*/
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

					$scope.clearHistory = () => {
						$rootScope.historyContent = '';
						HistoryLib.write('');
					}

					$scope.loadHistory = history => {
						$rootScope.scopeObj.loadHistory(history);
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
