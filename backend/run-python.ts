import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_DIR = path.join(__dirname, 'python');
const VENV_PATH = path.join(PYTHON_DIR, '.venv');
const REQUIREMENTS_FILE = path.join(PYTHON_DIR, 'requirements.txt');
const pythonExecutable = path.join(VENV_PATH, 'bin', 'python');
const pipExecutable = path.join(VENV_PATH, 'bin', 'pip');

async function main() {
  console.log(`Python Director: Working in ${PYTHON_DIR}`);

  if (!fs.existsSync(VENV_PATH)) {
    console.log('.venv not found. Creating it...');
    execSync(`python3 -m venv .venv`, { cwd: PYTHON_DIR, stdio: 'inherit' });
  }

  if (fs.existsSync(REQUIREMENTS_FILE)) {
    console.log('Ensuring requirements are installed...');
    execSync(`"${pipExecutable}" install -r requirements.txt`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit'
    });
  } else {
    console.warn('No requirements.txt found! Skipping install.');
  }

  console.log('Launching Uvicorn...');

  // We use 'python -m uvicorn' to ensure we use the uvicorn installed in the venv
  const uvicornProcess = spawn(
    pythonExecutable,
    ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'],
    {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
      shell: false
    }
  );

  uvicornProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

main().catch(err => console.error(err));