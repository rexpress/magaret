var data = {
  "name": "Flume Regex Extractor Interceptor",
  "description": "Testing flume regex extractor interceptor.",
  "author": "regular.express",
  "version": "1",
  "docker_image": "regexpress/flume",
  "properties": [
    {
      "name": "test_type",
      "type": "hidden",
	    "value" : "extractor"
    },
    {
      "name": "flume_context",
      "type": "string",
      "example": "regex = (\\d):(\\d):(\\d)\nserializers = s1 s2 s3\nserializers.s1.name = one\nserializers.s2.name = two\nserializers.s3.name = three",
      "help" : "Flume serializers config string for regex extractor.",
	    "required" : true
    }
  ]
}

var api_data = {"sha":"a764bb8f66f42975320640192d25c85476fd1147","url":"https://api.github.com/repos/rexpress/environments/git/trees/a764bb8f66f42975320640192d25c85476fd1147","tree":[{"path":"README.md","mode":"100644","type":"blob","sha":"c85a7e0d1bf9e9a214e502a6fd085964518bf730","size":58,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/c85a7e0d1bf9e9a214e502a6fd085964518bf730"},{"path":"flume","mode":"040000","type":"tree","sha":"8b057d0f09dea4a7930fdc667370a5837a0b5a62","url":"https://api.github.com/repos/rexpress/environments/git/trees/8b057d0f09dea4a7930fdc667370a5837a0b5a62"},{"path":"flume/_info.json","mode":"100644","type":"blob","sha":"ff85520d99ac8f14a414a38d67186e1303a1e2bf","size":231,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/ff85520d99ac8f14a414a38d67186e1303a1e2bf"},{"path":"flume/flume_extractor_interceptor.json","mode":"100644","type":"blob","sha":"38ae900f443f648b281a092456128461f69fae8d","size":627,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/38ae900f443f648b281a092456128461f69fae8d"},{"path":"flume/flume_filtering_interceptor.json","mode":"100644","type":"blob","sha":"8b1abec4b1efb573d2d6eec7ddfec3929f278e85","size":750,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/8b1abec4b1efb573d2d6eec7ddfec3929f278e85"},{"path":"hive","mode":"040000","type":"tree","sha":"0d0da1b7d3bc87ebc6ae7c8691f722d01b897311","url":"https://api.github.com/repos/rexpress/environments/git/trees/0d0da1b7d3bc87ebc6ae7c8691f722d01b897311"},{"path":"hive/_info.json","mode":"100644","type":"blob","sha":"9ca28cc89b09f21601ee1d0cf7554e375590e946","size":211,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/9ca28cc89b09f21601ee1d0cf7554e375590e946"},{"path":"hive/hive2.json","mode":"100644","type":"blob","sha":"2d9bb7bcf229f521a3fac9cc6f9e4bf1d96fa614","size":910,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/2d9bb7bcf229f521a3fac9cc6f9e4bf1d96fa614"},{"path":"java","mode":"040000","type":"tree","sha":"4bbb3520c3d26502cbff30d671c1fe16d8fcd5ff","url":"https://api.github.com/repos/rexpress/environments/git/trees/4bbb3520c3d26502cbff30d671c1fe16d8fcd5ff"},{"path":"java/_info.json","mode":"100644","type":"blob","sha":"eee75bcfe335543eaf2be5a5d4068738b566a8db","size":227,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/eee75bcfe335543eaf2be5a5d4068738b566a8db"},{"path":"python","mode":"040000","type":"tree","sha":"d4a536621cd41e7690d4f0a7026dc79665f65198","url":"https://api.github.com/repos/rexpress/environments/git/trees/d4a536621cd41e7690d4f0a7026dc79665f65198"},{"path":"python/_info.json","mode":"100644","type":"blob","sha":"3cb2a6f2fb06de5fcf7f5717bfd4f0f1b2248f32","size":147,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/3cb2a6f2fb06de5fcf7f5717bfd4f0f1b2248f32"},{"path":"python/python3-replace.json","mode":"100644","type":"blob","sha":"0766223de3a2ff46ca36045ecf32b4b22d3fa0dc","size":292,"url":"https://api.github.com/repos/rexpress/environments/git/blobs/0766223de3a2ff46ca36045ecf32b4b22d3fa0dc"}],"truncated":false}