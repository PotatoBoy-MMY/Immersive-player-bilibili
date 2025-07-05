const fs = require('fs');
const { execSync } = require('child_process');

const deps = ['express', 'axios', 'cors', 'express-session', 'bilibili-api'];
const missing = deps.filter(dep => !fs.existsSync(`node_modules/${dep}`));

if (missing.length > 0) {
  console.log('Missing dependencies:', missing.join(', '));
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (e) {
    console.error('Automatic install failed. Please run "npm install" manually.');
  }
}
