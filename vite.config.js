import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  base: '/focus-flow-client/', 
  plugins: [
    react(),
    {
      name: 'onnx-model-middleware',
      configureServer(server) {
        // Custom middleware to serve ONNX files with proper headers
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith('.onnx')) {
            // Set CORS headers
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/octet-stream');
            
            // Try to serve from public/models
            const onnxPath = resolve('public', req.url.slice(1));
            
            if (fs.existsSync(onnxPath)) {
              const content = fs.readFileSync(onnxPath);
              res.statusCode = 200;
              res.end(content);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  build: {
    commonjsOptions: {
      include: [/onnxruntime-web/, /node_modules/]
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep original name and path for ONNX files
          if (assetInfo.name.endsWith('.onnx')) {
            return 'models/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
