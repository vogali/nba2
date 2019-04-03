const
  fetch = require('node-fetch'),
  fs = require('fs'),
  FormData = require('form-data'),
  WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:40027');

var cmd;
var sessionUuid;
var child_process = require('child_process');
var capturing = false;

function uploadVideo() {
  cmd = child_process.spawn('ffmpeg', [
    '-y',
    '-i', 'data/' + sessionUuid + '.mp4',
    '-vf', 'select=eq(n\\,0)',
    '-q:v', '4',
    'data/' + sessionUuid + '.jpg'
  ]);

  cmd.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  cmd.on('close', (code) => {
    // upload
    let form = new FormData();
    form.append('sessionUuid', sessionUuid);
    form.append('data', fs.createReadStream('data/' + sessionUuid + '.mp4'));
    form.append('poster', fs.createReadStream('data/' + sessionUuid + '.jpg'));

    fetch('http://sap.onekind.com.cn/production/games/G0027/upload', { method: 'POST', body: form })
      .then(function(res) {
        console.log(res);
        return res.json();
      }).then(function(json) {
          //console.log(json);
          console.log(json.data);
      });
  });
}

ws.on('open', function open() {
});

ws.on('message', function incoming(data) {
  console.log(data);
  var s = data.split(' ');
  if (s.length == 2 && s[0] === 'RECORD_START') {
    if (capturing) {
      return;
    }
    capturing = true;
    sessionUuid = s[1];
    cmd = child_process.spawn('ffmpeg', [
      '-y',
      '-f', 'avfoundation',
      '-i', '2:0',
      '-t', '00:00:30',
      '-vf', 'crop=2560:1440:400:800',
      '-pix_fmt', 'yuv420p',
      '-s', '1024x576',
      '-r', '25',
      'data/' + sessionUuid + '.mp4'
    ]);

    cmd.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    cmd.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    cmd.on('close', (code) => {
      console.log(`Exit code of sub process ${code}`);
      capturing = false;
      uploadVideo();
    });
  } else if (s.length == 2 && s[0] === 'RECORD_STOP') {
    if (capturing) {
      cmd.kill();
    }
  }
});
