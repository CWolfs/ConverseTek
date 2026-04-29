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
    alias: [
      {
        find: /^react-sortable-tree$/,
        replacement: path.resolve(__dirname, 'node_modules/react-sortable-tree/dist/index.cjs.js'),
      },
      {
        find: /^react-virtualized$/,
        replacement: path.resolve(__dirname, 'node_modules/react-virtualized/dist/commonjs/index.js'),
      },
      { find: 'components', replacement: path.resolve(__dirname, 'src/components/') },
      { find: 'containers', replacement: path.resolve(__dirname, 'src/containers/') },
      { find: 'services', replacement: path.resolve(__dirname, 'src/services/') },
      { find: 'hooks', replacement: path.resolve(__dirname, 'src/hooks/') },
      { find: 'stores', replacement: path.resolve(__dirname, 'src/stores/') },
      { find: 'utils', replacement: path.resolve(__dirname, 'src/utils/') },
      { find: 'types', replacement: path.resolve(__dirname, 'src/types/') },
      { find: 'package.json', replacement: path.resolve(__dirname, 'package.json') },
    ],
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
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        math: 'always',
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
