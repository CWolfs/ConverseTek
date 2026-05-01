import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const isServe = process.env.npm_lifecycle_event === 'start';
const legacyAssetsSource = path.resolve(__dirname, 'src/assets');
const legacyAssetsOut = path.resolve(__dirname, '../dist/assets');

function reactDevtoolsPlugin(): Plugin {
  return {
    name: 'conversetek-react-devtools',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: {
              src: 'http://127.0.0.1:8097',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

function legacyAssetsPlugin(): Plugin {
  return {
    name: 'conversetek-legacy-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (request, response, next) => {
        const requestUrl = request.url == null ? '' : decodeURIComponent(request.url.split('?')[0]);
        const relativePath = requestUrl.replace(/^\/+/, '').replace(/^assets[\\/]/, '');
        const assetPath = path.resolve(legacyAssetsSource, relativePath);

        if (!assetPath.startsWith(legacyAssetsSource) || !fs.existsSync(assetPath) || fs.statSync(assetPath).isDirectory()) {
          next();
          return;
        }

        response.statusCode = 200;
        fs.createReadStream(assetPath).pipe(response);
      });
    },
    closeBundle() {
      fs.cpSync(legacyAssetsSource, legacyAssetsOut, {
        recursive: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [reactDevtoolsPlugin(), react(), legacyAssetsPlugin()],
  root: __dirname,
  publicDir: false,
  define: {
    __BUILD_DATE__: JSON.stringify(`LOCAL ${new Date(Date.now()).toUTCString()}`),
    __INITIAL_ROUTE_PATH__: JSON.stringify(isServe ? '/' : 'index.html'),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
      containers: path.resolve(__dirname, 'src/containers'),
      services: path.resolve(__dirname, 'src/services'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      stores: path.resolve(__dirname, 'src/stores'),
      utils: path.resolve(__dirname, 'src/utils'),
      types: path.resolve(__dirname, 'src/types'),
      'package.json': path.resolve(__dirname, 'package.json'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    rolldownOptions: {
      transform: {
        define: {
          global: 'globalThis',
        },
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
