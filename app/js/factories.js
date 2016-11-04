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
				return content;

			}catch(error) {
				return null
			}
		},
		'write': function(key, value) {
			jsonfile.writeFileSync(getFilePath(key), value);
		}
	}

});

function getEnvironments() {
	const request = require('request');
	const httpContext = {
		'headers': {
			'User-Agent': 'regular.express Client'
		}
	}
	request.get('http://regular.express/environments.json', httpContext,
		(err, res, body) => {

	});
}

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

			request.get('https://api.github.com/repos/rexpress/environments/git/trees/master?recursive=1', httpContext,
				(err, res, body) => {
					const data = JSON.parse(body);

					for (var i of data.tree) {
						const tmp = i.path.split('/');
						if (tmp.length != 2) continue;
						
						const envGroupName = tmp[0];
						const envChildName = tmp[1].split('.json')[0];

						var target;
						if (envChildName == '_info') {
							envInfo[ envGroupName ] = target = {
								'name': envGroupName,
								'children': []
							}
						}else {
							target = {'name': envChildName}
							envInfo[ envGroupName ].children.push(target);
						}
						queue.push({
							'path': envGroupName + '/' + envChildName + '.json',
							'target': target
						});
					}

					async.eachSeries(queue,
						function iteratee(item, callback) {
							const request = require('request');
							const path = item.path;

							console.log('GET ' + item.path);
							request.get(`https://github.com/rexpress/environments/raw/master/${path}`, httpContext,
								(err, res, body) => {
									item.target.info = JSON.parse(body);
									callback(null);
								}
							);
						},
						function() {
							console.log('Loading env is finished complete');
							console.log(envInfo);

							onCompleteCallback(envInfo);
						}
					);
				}
			);
		}
	}
});