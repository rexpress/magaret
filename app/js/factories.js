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
				var data = jsonfile.readFileSync( getFilePath() ).data;
				if (!Array.isArray(data))
					return [];
				return data;
			} catch (e) {
				return [];
			}
		},
		write: function(value) {
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
		'save': function(token) {
			if (this.load() == token) return;
			const async = require('async');
			async.parallel([
				function (callback) {
					request.get('https://api.github.com/user',
						{
							'headers': {
								'User-Agent': 'regular.express Client',
								'Authorization': `token ${token}`	
							},
						},
						(err, res, body) => {
							var data;

							if (!err) {
								var obj = JSON.parse(body);
								callback(null, obj);
							}
							else {
								callback(null, null)
							}
						}
					);
				},
			], function(err, result) {
				console.log(result);
				jsonfile.writeFileSync(getFilePath(), { data: token, user: result[0] });
			})
		},
		'load': function() {
			try {
				var content = jsonfile.readFileSync( getFilePath() );
				return {
					'avatar_url': content.user.avatar_url,
					'access_token': content.data
				};

			}catch(error) {
				return null
			}
		},
		'reset': function() {
			jsonfile.writeFileSync(getFilePath(), { data: null });
			return null;
		},
		'verify': function(token) {
			request.get('https://api.github.com/user',
				{
					'headers': {
						'User-Agent': 'regular.express Client',
						'Authorization': `token ${token}`	
					},
				},
				(err, res, body) => {
					var data;

					console.log(body);
					if (!err) {
						var obj = JSON.parse(body);
						console.log(obj);
						return obj;
					}
					else {
						console.error(res);
						return null;
					}
				}
			);
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

			request.get('http://rexpress.github.io/environments.json', httpContext,
				(err, res, body) => {
					var data;
					try {
						data = clearName(sortJSON(JSON.parse(body)));
					}
					catch (e) {
						console.log(body);
						console.warn(`LoadEnv Failed : ${e.message}`);
					}
					console.log('LoadEnv Completed');
					onCompleteCallback(data);
				}
			);
		}
	}
});