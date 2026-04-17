const fs = require('fs');
const path = require('path');
const srcAudioDir = path.join(__dirname, 'output', 'audio');
const dstAudioDir = path.join(__dirname, 'remotion', 'public', 'audio');
const files = fs.readdirSync(srcAudioDir).filter(f => f.endsWith('.mp3'));
files.forEach(file => {
  fs.copyFileSync(path.join(srcAudioDir, file), path.join(dstAudioDir, file));
  console.log('コピー完了：' + file);
});