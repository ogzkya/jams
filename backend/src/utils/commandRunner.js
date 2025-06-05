const { spawn } = require('child_process');

// Çalıştırılabilir betikler
const SCRIPTS = {
  restartApp: '/usr/local/bin/restart-app.sh',
  clearCache: '/usr/local/bin/clear-cache.sh'
};

async function runScript(key) {
  return new Promise((resolve, reject) => {
    const script = SCRIPTS[key];
    if (!script) return reject(new Error('Bilinmeyen script'));
    const child = spawn(script, [], { shell: false });
    let output = '';
    child.stdout.on('data', d => (output += d.toString()));
    child.stderr.on('data', d => (output += d.toString()));
    child.on('close', code => {
      if (code === 0) resolve(output);
      else reject(new Error(`Script çıkış ${code}: ${output}`));
    });
  });
}

module.exports = { runScript };
