app.factory('HistoryLib', function () {
	const jsonfile = require('jsonfile');
	const fs = require('fs');

	const base = './history';
	const histfile = 'history.json';

	if (!fs.existsSync(base))
		fs.mkdir(base);

	function getFilePath(key) {
		return base + encodeURI(key);
	}

	return {
		read: function() {
			return jsonfile.readFileSync( base + encodeURI('histfile').data );
		},
		write: function() {
			jsonfile.writeFileSync(getFilePath(key), { timestamp: Date.now(), data: value });
		}
	}
});

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
				console.info(keys);
				keys.sort();
				for (i = 0; i < len; i++) {
					k = keys[i];
					newObj[k] = obj[k];
				}
				return newObj;
			}

			var queue = [];
			var envInfo = {}

			request.get('http://regular.express/environments.json', httpContext,
				(err, res, body) => {
					var data;
					try {
						data = sortJSON(JSON.parse(body));
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