app.factory('HistoryLib', function () {
	const jsonfile = require('jsonfile');
	const fs = require('fs');

	const base = './history/';
	const histfile = 'history.json';

	if (!fs.existsSync(base))
		fs.mkdir(base);

	function getFilePath(key) {
		return base + histfile;
	}

	return {
		read: function() {
			try {
				return jsonfile.readFileSync( getFilePath() ).data;
			} catch (e) {
				return null;
			}
		},
		write: function() {
			jsonfile.writeFileSync(getFilePath(), { timestamp: Date.now(), data: value });
		}
	}
});

app.factory('GitHubToken', function () {
	const jsonfile = require('jsonfile');
	const fs = require('fs');

	const base = './cache/';

	if (!fs.existsSync(base))
		fs.mkdir(base);

	function getFilePath() {
		return base + 'appkey.json';
	}
	return {
		'save': function(value) {
			jsonfile.writeFileSync(getFilePath(), { data: value });
		},
		'load': function() {
			try {
				var content = jsonfile.readFileSync( getFilePath() );
				return content.data;

			}catch(error) {
				return null
			}
		},
		'reset': function() {
			jsonfile.writeFileSync(getFilePath(), { data: null });
			return null;
		}
	}
})

app.factory('CacheLib', function () {
	const jsonfile = require('jsonfile');
	const fs = require('fs');

	const base = './cache/';

	if (!fs.existsSync(base))
		fs.mkdir(base);

	function getFilePath(key) {
		return base + encodeURI(key);
	}

	return {
		'read': function(key) {
			try {
				var content = jsonfile.readFileSync( getFilePath(key) );
				
				// cache livetime is one days
				if (content.timestamp + 1000 < Date.now() || Object.keys(content.data).length === 0) {
					console.warn('Cache expired');
					return null;
				}
				return content.data;

			}catch(error) {
				return null
			}
		},
		'write': function(key, value) {
			jsonfile.writeFileSync(getFilePath(key), { timestamp: Date.now(), data: value });
		}
	}

});

app.factory('Environments', function() {
	return {
		'load': function (onCompleteCallback) {
			const request = require('request');
			const async = require('async');

			const httpContext = {
				'headers': {
					'User-Agent': 'regular.express Client'
				}
			};

			var sortJSON = (obj) => {
				let keys = Object.keys(obj);
				let i, len = keys.length, k;

				var newObj = {};
				keys.sort();
				for (i = 0; i < len; i++) {
					k = keys[i];
					newObj[k] = obj[k];
				}
				return newObj;
			}

			String.prototype.replaceAll = function(search, replacement) {
				var target = this;
				return target.split(search).join(replacement);
			};

			var clearName = (obj) => {
				console.warn(obj);
				for (let a in obj) {
					let parent = obj[a].info.title.split(' ');
					parent = parent[parent.length - 1];
					for (let c in obj[a].children) {
						let name = obj[a].children[c].name;
						name = name.replaceAll(parent.toLowerCase(), parent);
						name = name.replaceAll('-', ' ');
						var name_sp = name.split(' ');
						name = '';
						for (let n in name_sp) {
							if (n > 0 && name_sp[n][0] >= 'a' && name_sp[n][0] <= 'z')
								name_sp[n] = name_sp[n][0].toUpperCase() + name_sp[n].substr(1);
							name += name_sp[n] + ' ';
						}
						obj[a].children[c].displayName = name;
					}
					//console.info(obj[a]);
				}
				return obj;
			}

			var queue = [];
			var envInfo = {}

			request.get('http://regular.express/environments.json', httpContext,
				(err, res, body) => {
					var data;
					try {
						data = clearName(sortJSON(JSON.parse(body)));
					}
					catch (e) {
						console.warn(`Loading Env Failed : ${e.message}`);
					}
					console.log('Loading env is finished complete');
					onCompleteCallback(data);
				}
			);
		}
	}
});