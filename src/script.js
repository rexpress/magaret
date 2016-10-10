var resize = (function (text) {
  "use strict";

  var observe = function (element, event, handler) {
    element.addEventListener(event, handler, false);
  };
  var resize = () => {
    text.style.height = '1rem';
    text.style.overflow = 'hidden';
    if (text.scrollHeight != 0)
      text.style.height = text.scrollHeight+'px';
    else
      text.style.height = '1rem';
      
    text.style.overflow = '';
  }
  var delayedResize = () => {
    window.setTimeout(resize, 0);
  }
  observe(text, 'change',  resize);
  observe(text, 'cut',     delayedResize);
  observe(text, 'paste',   delayedResize);
  observe(text, 'drop',    delayedResize);
  observe(text, 'keydown', delayedResize);

  text.focus();
  text.select();
  resize();
});

var docker_exec = (run, param, stdout, stderr, end) => {
  "use strict";
  
  const spawn = require('child_process').spawn;
  const ls = spawn(run, param);
  ls.stdout.on('data', stdout);
  ls.stderr.on('data', stderr);
  ls.on('close', end);
}

(function (w, d, undefined) {
	"use strict";

  var env_info = d.getElementById('env-info');
  var fields = env_info.getElementsByTagName('span');
  fields[0].innerHTML = data.title;
  fields[1].innerHTML = data.description;
  fields[2].innerHTML =
    [`By ${data.author}`, `Version: ${data.version}`, `Keyword: ${data.keyword.join(', ')}`].join(' | ');

  var properties = data.properties;
  var prop_table = d.getElementById('property-list');
  var btn = d.createElement('button');
  var test_btn = d.getElementById('test-btn')
  btn.innerText = "Test";
  test_btn.appendChild(btn);
  var property_list = [];
  for (let prop of properties) {
    var tr = d.createElement('tr');

    var th = d.createElement('th');
    var name = d.createElement('span');
    name.innerHTML = prop.name;
    if (prop.required) name.classList.add('required');
    th.appendChild(name);
    var help = d.createElement('a');
    help.className = 'help';
    help.title = prop.help;
    help.href = '#';
    help.innerHTML = '?';
    th.appendChild(help);
    tr.appendChild(th);

    var td = d.createElement('td');
    var input;
    switch (prop.type) {
      case 'string':
        input = d.createElement('textarea');
        resize(input);
        //input.type = 'text';
        input.placeholder = prop.placeholder;
        break;
      case 'number':
        input = d.createElement('input');
        input.type = 'number';
        input.placeholder = prop.placeholder;
        break;
      case 'boolean':
        input = d.createElement('input');
        input.type = 'checkbox';
        input.checked = prop.placeholder;
        break;
      case 'list':
        input = d.createElement('select');
        for (let x in prop.list) {
          let opt = d.createElement('option');
          if (x === prop.default) opt.selected = true;
          opt.value = x;
          opt.innerHTML = prop.list[x];
          input.options.add(opt);
        }
        break;
    }
    input.dataset.name = prop.name;
    td.appendChild(input);
    if (prop.example) {
      var example = d.createElement('span');
      example.className = 'example';
      example.innerHTML = `example: ${prop.example}`;
      td.appendChild(example);
    }
    tr.appendChild(td);

    prop_table.appendChild(tr);

    property_list.push(input);
  }

  var textarea;
  var test_set = d.getElementById('test-set');
  console.log(test_set.innerHTML);
  textarea = d.createElement('textarea');
  textarea.dataset.name = 'test-set';
  test_set.appendChild(textarea);
  var result_set = d.getElementById('result-set');
  textarea = d.createElement('textarea');
  textarea.dataset.name = 'result-set';
  result_set.appendChild(textarea);

  btn.addEventListener('click', () => {
    var property = {};
    for (let x of property_list) {
      if (x.type == 'checkbox')
        property[x.dataset.name] = x.checked;
      else
        property[x.dataset.name] = x.value;
    }
    console.info(property);

    var testObj = {};
    testObj.testString = document.querySelector('[data-name="test-set"]').value.trim().split('\n');
    console.info(testObj);
    
    var result_set = document.querySelector('[data-name="result-set"]');

    docker_exec('docker', ['run', '--rm', '-i', 'ubuntu:16.04', 'echo',`##START_RESULT##${JSON.stringify(property)} ${JSON.stringify(testObj)}##END_RESULT##`], 
      (data) => {
        var str = data.toString();
        var START_RESULT = '##START_RESULT##';
        var END_RESULT = '##END_RESULT##';
        if (str.substr(START_RESULT) != -1 && str.search(END_RESULT) != -1) {
          str = str.substr(START_RESULT.length);
          str = str.substr(0, str.search(END_RESULT));
          result_set.value = str;
          console.log(str);
        }
      },
      (data) => {
        console.info(`${data}`);
      },
      (code) => {
        console.log(`child process exited with code ${code}`);
    });
  });

})(window, document);
