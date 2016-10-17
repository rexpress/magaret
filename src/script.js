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

function escapeShellArg (cmd) {
    return '\'' + cmd.replace(/\'/g, "'\\''") + '\'';
}

var docker_exec = (run, param, stdout, stderr, end) => {
  "use strict";
  
  const spawn = require('child_process').spawn;
  const ls = spawn(run, param, {
    detached: true,
    windowsVerbatimArguments: true
  });
  ls.stdout.on('data', stdout);
  ls.stderr.on('data', stderr);
  ls.on('close', end);
}

var open_env = el => {
  "use strict";

  console.log("open_env: " + el.dataset.envName);

  const request = require('request');
  request.get(`https://github.com/rexpress/environments/raw/master/${el.dataset.envName}`,
    {
      headers: {
      'User-Agent': 'regex_agent'
    }
  },(err, res, body) => {
    data = JSON.parse(body);
    data_fill(window, document);
    console.log(data);
  }
);
}

var reqEnvPath = (w, d, j) => {
  for (let x of j.tree) {
    var list = [];
    if (x.type == 'tree') {
      for (let y of j.tree) {
          if (x.path == y.path.split('/')[0] && y.path.split('/')[1] && y.path.split('/')[1][0] != '_') {
          console.log(y.path);
          var name = y.path.split('/')[1];
          if (typeof name !== 'undefined')
            name = name.substr(0, name.search('.json'));

          var nav = d.getElementById('sidebar-navi');
          var item = d.createElement('a');
          item.href = "javascript:void(0);";
          item.addEventListener('click', (e) => {
            for (let z of d.querySelectorAll('.item-select, .item-focus')) {
              if (z == e.target) continue;
              z.classList.remove('item-select');
              z.classList.remove('item-focus');
            }
            let el = e.target;
            if (el.tagName == 'SPAN')
              el = el.parentNode;
            el.classList.add('item-select');
            el.classList.add('item-focus');
            open_env(el);
          });

          //item.classList.add('item-select');

          var list_arrow = d.createElement('span');
          list_arrow.classList.add('list-arrow');
          list_arrow.innerText = "▶ ";
          item.appendChild(list_arrow);

          var list_text = d.createElement('span');
          list_text.classList.add('list-text');
          list_text.innerText = name;
          item.appendChild(list_text);

          item.dataset.envName = y.path;

          list.push(item);
          console.log(list);

        }
      }

      if (!list.length) continue;

      var nav = d.getElementById('sidebar-navi');
      var item = d.createElement('a');
      item.href = "javascript:void(0);";

      //item.classList.add('item-select');

      var list_arrow = d.createElement('span');
      list_arrow.classList.add('list-arrow');
      list_arrow.innerText = "▼ ";
      item.appendChild(list_arrow);

      var list_text = d.createElement('span');
      list_text.classList.add('list-text');
      list_text.innerText = x.path;
      item.appendChild(list_text);

      if (!document.querySelectorAll('.item-focus').length)
        item.classList.add('item-focus');
      item.dataset.envName = x.path;
      nav.appendChild(item);

      var p_div = d.createElement('div');
      p_div.className = 'sub-list';
      for (var v of list) {
        p_div.appendChild(v);
      }
      nav.appendChild(p_div);

    } // if tree 
  }
  console.log(j);
}


  // const request = require('sync-request');
  // console.log(request);
  // var res = request('GET', 'https://api.github.com/repos/rexpress/environments/git/trees/master?recursive=1');
  // if (res.statusCode == 200 && res.body) {
  // }

(function (w, d, undefined) {
	"use strict";

  d.addEventListener('keydown', e => {
    if (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA') return true;
    var select = d.querySelector('.item-select');
    var focus = d.querySelector('.item-focus');
    var prev = (typeof focus !== 'undefined' ? focus.previousElementSibling : '');
    var next = (typeof focus !== 'undefined' ? focus.nextElementSibling : '');
    while(1) {
      if (prev != null && prev.tagName != 'A') {
        if (prev.classList.contains('sub-list')) {
          console.log('asdfasdf');
          prev = prev.children[prev.childElementCount-1];
          break;
        }
        prev = prev.previousElementSibling;
        if (typeof prev != 'undefined' && prev.tagName == 'A') break;
        console.info(prev);
        
      }
      else if (prev == null && focus.parentElement.classList.contains('sub-list')) {
        prev = focus.parentElement.previousElementSibling;
        console.info(prev);
        if (typeof prev != 'undefined' && prev.tagName == 'A') break;
      }
      
        //prev = prev.previousElementSibling;
      else break;
    }
    while(1) {
      if (next != null && next.tagName != 'A') {
        if (next.classList.contains('sub-list') && next.childElementCount) {
          next = next.children[0];
          break;
        }
      
        next = next.nextElementSibling;
        if (typeof next != 'undefined' && next.tagName == 'A') break;
      }
      else if (next == null && focus.parentElement.classList.contains('sub-list')) {
        next = focus.parentElement.nextElementSibling;
        break;
      }
      else break;
    }
    switch(e.key) {
      case 'ArrowUp':
        if (prev != null && prev.tagName == 'A') {
          focus.classList.remove('item-focus');
          prev.classList.add('item-focus');
          e.preventDefault();
          return false;
        }
        break;
      case 'ArrowDown':
        if (next != null && next.tagName == 'A') {
          focus.classList.remove('item-focus');
          next.classList.add('item-focus');
          e.preventDefault();
          return false;
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        break;
      case 'Enter':
        if (select != null) {
          select.classList.remove('item-focus');
          select.classList.remove('item-select');
        }
        focus.classList.add('item-select');
        open_env(focus);
        e.preventDefault();
        return false;
    }
  });
  var nav_webpage = d.getElementById('nav_webpage');
  // nav_webpage.addEventListener('click', e => {
  //   w.open('https://rexpress.github.io/')});
}(window, document));

(function (w, d) {
  "use strict";
  // const request = require('request');
  // request.get('https://api.github.com/repos/rexpress/environments/git/trees/master?recursive=1', {
  //   headers: {
  //     'User-Agent': 'regex_agent'
  //   }
  // },(err, res, body) => {
  //   var j = JSON.parse(body);
  //   reqEnvPath(j)
  // });
  reqEnvPath(w, d, api_data);
})(window, document);

var data_fill = function (w, d, undefined) {
	"use strict";

  var container = d.getElementsByClassName('_container')[0];
  container.innerHTML = '';
  container.style = '';
  var notice = d.createElement('div');
  notice.id = 'notice';
  container.appendChild(notice);
  var wrapper = d.createElement('div');
  wrapper.id = 'wrapper';

  var w_header = d.createElement('div');
  w_header.id = 'header';

  var w_env_info = d.createElement('div');
  w_env_info.id = 'env-info';

  var w_env_title = d.createElement('span');
  w_env_title.className = 'title';
  var w_env_description = d.createElement('span');
  w_env_description.className = 'description';
  var w_env_details = d.createElement('span');
  w_env_details.className = 'details';
  w_env_info.appendChild(w_env_title);
  w_env_info.appendChild(w_env_description);
  w_env_info.appendChild(w_env_details);
  w_header.appendChild(w_env_info);

  var w_test_btn = d.createElement('div');
  w_test_btn.id = 'test-btn';
  w_header.appendChild(w_test_btn);
  wrapper.appendChild(w_header);

  var w_property_list = d.createElement('table');
  w_property_list.id = 'property-list';
  wrapper.appendChild(w_property_list);

  var w_label_item = d.createElement('div');
  w_label_item.id = 'label-item';
  var w_label_item_label = d.createElement('span');
  w_label_item_label.className = 'label';
  w_label_item_label.innerText = 'Test Set';
  w_label_item.appendChild(w_label_item_label);
  wrapper.appendChild(w_label_item);

  var w_test_set = d.createElement('div');
  w_test_set.id = 'test-set';
  wrapper.appendChild(w_test_set);

  var w_label_item = d.createElement('div');
  w_label_item.id = 'label-item';
  var w_label_item_label = d.createElement('span');
  w_label_item_label.className = 'label';
  w_label_item_label.innerText = 'Result Set';
  w_label_item.appendChild(w_label_item_label);
  wrapper.appendChild(w_label_item);
  
  var w_result_set = d.createElement('div');
  w_result_set.id = 'result-set';
  wrapper.appendChild(w_result_set);

  container.appendChild(wrapper);

  var env_info = d.getElementById('env-info');
  var fields = env_info.getElementsByTagName('span');
  fields[0].innerHTML = (data.name != null ? data.name : 'N/A');
  fields[1].innerHTML = (data.description != null ? data.description : '');
  fields[2].innerHTML =
    [`By ${(typeof data.author !== 'undefined') ? data.author : 'N/A'}`, `Version: ${(typeof data.version !== 'undefined') ? data.version : 'N/A'}`, `Image: ${(typeof data.docker_image !== 'undefined') ? data.docker_image : 'N/A'}`/*, `Keyword: ${(typeof data.keyword !== 'undefined') ? data.keyword.join(', ') : 'N/A'}`*/].join(' | ');

  var properties = data.properties;
  var prop_table = d.getElementById('property-list');
  var test_btn = d.createElement('button');
  var reset_btn = d.createElement('button');
  var btn_el = d.getElementById('test-btn')
  reset_btn.innerText = "Reset";
  test_btn.innerText = "Test";
  if (typeof data.docker_image === 'undefined') {
    btn_el.className = 'disable-btn';
    var notice = d.getElementById('notice');
    notice.className = 'notice_red';
    notice.innerText = '도커 이미지가 존재하지 않아 테스트가 불가능한 환경입니다.'
  }
  btn_el.appendChild(test_btn);
  btn_el.appendChild(reset_btn);
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
        break;
      case 'number':
        input = d.createElement('input');
        input.type = 'number';
        break;
      case 'boolean':
        input = d.createElement('input');
        input.type = 'checkbox';
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
      default:
        continue;
    }
    switch(prop.type) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'list':
        if (typeof prop.placeholder !== 'undefined')
          input.placeholder = prop.placeholder;
        input.dataset.name = prop.name;
    }
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

  reset_btn.addEventListener('click', () => {
    for (let x of property_list) {
      if (x.type == 'checkbox')
        x.checked = false;
      else
        x.value = '';
    }
    document.querySelector('[data-name="test-set"]').value = '';
    document.querySelector('[data-name="result-set"]').value = '';
  });

  test_btn.addEventListener('click', () => {
    var property = {};
    for (let x of property_list) {
      if (x.type == 'checkbox')
        property[x.dataset.name] = x.checked;
      else
        property[x.dataset.name] = x.value;
    }
    console.info(property);

    var testObj;
    testObj = document.querySelector('[data-name="test-set"]').value.trim().split('\n');
    console.info(testObj);
    
    var result_set = document.querySelector('[data-name="result-set"]');
    result_set.value = '';

    var success = false;
    var last_err = '';
    console.log(`${JSON.stringify(property)} ${JSON.stringify(testObj)}`);
    var property = JSON.stringify(property);
    var teststr = JSON.stringify(testObj);
    var res = property + ' ' + teststr;
    res = res.split(' ');
    console.log(res);
    console.info(`"${property}" "${teststr}"`);
    docker_exec('docker', ['run', '--rm', '-i', `${data.docker_image}`,`${property}`,`${teststr}`], 
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
        success = true;
      },
      (data) => {
        console.info(`${data}`);
        last_err = data.toString();
        notice.className = 'notice_blue';
        notice.innerText = last_err;
      },
      (code) => {
        if (!success) {
          var notice = document.getElementById('notice');
          notice.className = 'notice_red';
          notice.innerText = last_err;
        }
        else {
          notice.className = '';
          notice.innerText = '';
        }
        console.log(`child process exited with code ${code}`);
    });
  });

}
