import { fs, path } from './nw'

window.__extend = window.__extend || function (t, j) {
  Object.assign(t, j)
}

/**
 * 文件遍历方法
 * @param filePath 需要遍历的文件路径
 */
export function fileDisplay(filePath) {
  //根据文件路径读取文件，返回文件列表
  fs.readdir(filePath, function (err, files) {
    if (err) {
      console.warn(err, "读取文件夹错误！")
    } else {
      //遍历读取到的文件列表
      files.forEach(function (filename) {
        //获取当前文件的绝对路径
        var filedir = path.join(filePath, filename);
        //根据文件路径获取文件信息，返回一个fs.Stats对象
        fs.stat(filedir, function (eror, stats) {
          if (eror) {
            console.warn('获取文件stats失败');
          } else {
            var isFile = stats.isFile(); //是文件
            var isDir = stats.isDirectory(); //是文件夹
            if (isFile) {
              console.log(filedir);
            }
            if (isDir) {
              fileDisplay(filedir); //递归，如果是文件夹，就继续遍历该文件夹下面的文件
            }
          }
        })
      });
    }
  });
}

export function notification(title, content, iconurl, imageUrl, sound) {
  Notification.requestPermission().then(function (permission) {
    if (permission == 'granted') {
      var n = new Notification(title, {
        body: content,
        icon: iconurl,
        image: imageUrl,
        sound: sound,
        silent: true
      });
      n.onclick = function () {
        alert(content)
        mynotification.close();
      }
      setTimeout(function () {
        n.close();
      }, 3000);
    }
  });
}

export function str_repeat(i, m) {
  for (var o = []; m > 0; o[--m] = i);
  return o.join('');
}

String.prototype.format = function () {
  var args = arguments;
  return this.replace(/%([0-9]+)/g, function (s, n) {
    return args[Number(n) - 1]
  })
};

String.prototype.padZero = function (length) {
  var s = this;
  while (s.length < length) {
    s = '0' + s
  }
  return s
};

export function sprintf() {
  var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
  while (f) {
    if (m = /^[^\x25]+/.exec(f)) {
      o.push(m[0]);
    }
    else if (m = /^\x25{2}/.exec(f)) {
      o.push('%');
    }
    else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
      if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
        throw ('Too few arguments.');
      }
      if (/[^s]/.test(m[7]) && (typeof (a) != 'number')) {
        throw ('Expecting number but found ' + typeof (a));
      }
      switch (m[7]) {
        case 'b': a = a.toString(2); break;
        case 'c': a = String.fromCharCode(a); break;
        case 'd': a = parseInt(a); break;
        case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
        case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
        case 'o': a = a.toString(8); break;
        case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
        case 'u': a = Math.abs(a); break;
        case 'x': a = a.toString(16); break;
        case 'X': a = a.toString(16).toUpperCase(); break;
      }
      a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+' + a : a);
      c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
      x = m[5] - String(a).length - s.length;
      p = m[5] ? str_repeat(c, x) : '';
      o.push(s + (m[4] ? a + p : p + a));
    }
    else {
      throw ('Huh ?!');
    }
    f = f.substring(m[0].length);
  }
  return o.join('');
}
