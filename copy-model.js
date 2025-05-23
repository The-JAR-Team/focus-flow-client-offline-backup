// This script copies the ONNX model file to various locations
// to ensure it can be found by the application

// Run this with Node.js: node copy-model.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source ONNX model
const sourceFile = path.join(__dirname, 'src', 'hooks', 'engagement_multitask_v4.onnx');

// Target directories
const targetDirs = [
  path.join(__dirname, 'public', 'models'),
  path.join(__dirname, 'dist', 'models'),
  path.join(__dirname, 'models')
];

// Ensure each target directory exists
targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy the file to each target directory
targetDirs.forEach(dir => {
  const targetFile = path.join(dir, 'engagement_multitask_v4.onnx');
  try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`Copied model to: ${targetFile}`);
  } catch (error) {
    console.error(`Failed to copy to ${targetFile}:`, error.message);
  }
});

console.log('ONNX model copy completed');
