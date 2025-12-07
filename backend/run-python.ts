import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
// We assume this script is located in 'backend/run_python.ts'
// So we go one level deeper to get to 'backend/python'
const PYTHON_DIR = path.join(__dirname, 'python'); 
const VENV_PATH = path.join(PYTHON_DIR, '.venv');
const REQUIREMENTS_FILE = path.join(PYTHON_DIR, 'requirements.txt');

// --- OS SPECIFIC HELPERS ---
const isWindows = process.platform === 'win32';
const pythonExecutable = path.join(VENV_PATH, isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python');
const pipExecutable = path.join(VENV_PATH, isWindows ? 'Scripts' : 'bin', isWindows ? 'pip.exe' : 'pip');

async function main() {
  console.log(`🐍 Python Director: Working in ${PYTHON_DIR}`);

  // 1. Create .venv if it doesn't exist
  if (!fs.existsSync(VENV_PATH)) {
    console.log('📦 .venv not found. Creating it...');
    try {
      // We run this command inside the PYTHON_DIR so the folder creates in the right place
      execSync(`python3 -m venv .venv`, { cwd: PYTHON_DIR, stdio: 'inherit' });
    } catch (e) {
      // Windows fallback
      execSync(`python -m venv .venv`, { cwd: PYTHON_DIR, stdio: 'inherit' });
    }
  }

  // 2. Install Requirements
  if (fs.existsSync(REQUIREMENTS_FILE)) {
    console.log('📥 Ensuring requirements are installed...');
    execSync(`"${pipExecutable}" install -r requirements.txt`, { 
      cwd: PYTHON_DIR, 
      stdio: 'inherit' 
    });
  } else {
    console.warn('⚠️ No requirements.txt found! Skipping install.');
  }

  // 3. Launch Uvicorn using the VENV Python
  console.log('🚀 Launching Uvicorn...');
  
  // We use 'python -m uvicorn' to ensure we use the uvicorn installed in the venv
  const uvicornProcess = spawn(
    pythonExecutable, 
    ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'], 
    { 
      cwd: PYTHON_DIR, // Important: Run inside backend/python so it finds main.py
      stdio: 'inherit',
      shell: false
    }
  );

  uvicornProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

main().catch(err => console.error(err));