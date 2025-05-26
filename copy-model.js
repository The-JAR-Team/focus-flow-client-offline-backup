// This script copies the ONNX model files to various locations
// to ensure they can be found by the application

// Run this with Node.js: node copy-model.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source ONNX models
const modelFiles = [
  {
    source: path.join(__dirname, 'src', 'hooks', 'engagement_multitask_v4.onnx'),
    filename: 'engagement_multitask_v4.onnx'
  },
  {
    source: path.join(__dirname, 'public', 'models', 'v1.onnx'),
    filename: 'v1.onnx'
  }
];

// Target directories
const targetDirs = [
  path.join(__dirname, 'public', 'models'),
  path.join(__dirname, 'dist', 'models'),
  path.join(__dirname, 'models'),
  path.join(__dirname, 'src', 'hooks')
];

// Ensure each target directory exists
targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy each model file to each target directory
modelFiles.forEach(model => {
  if (!fs.existsSync(model.source)) {
    console.warn(`Source model not found: ${model.source}`);
    return;
  }

  console.log(`\nProcessing model: ${model.filename}`);
  
  targetDirs.forEach(dir => {
    const targetFile = path.join(dir, model.filename);
    
    // Skip copying to the same location
    if (path.resolve(model.source) === path.resolve(targetFile)) {
      console.log(`Skipping self-copy: ${targetFile}`);
      return;
    }
    
    try {
      fs.copyFileSync(model.source, targetFile);
      console.log(`Copied ${model.filename} to: ${targetFile}`);
    } catch (error) {
      console.error(`Failed to copy ${model.filename} to ${targetFile}:`, error.message);
    }
  });
});

console.log('\nONNX models copy completed');
console.log('Available models should now be accessible from all required locations.');
