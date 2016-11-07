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

			var queue = [];
			var envInfo = {}

			request.get('http://regular.express/environments.json', httpContext,
				(err, res, body) => {
					const data = JSON.parse(body);
					console.log('Loading env is finished complete');
					onCompleteCallback(data);
				}
			);
		}
	}
});