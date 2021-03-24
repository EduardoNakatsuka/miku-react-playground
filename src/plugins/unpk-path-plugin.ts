import axios from 'axios';
import * as esbuild from 'esbuild-wasm';
import localForage from 'localforage';

const fileCache = localForage.createInstance({
  name: 'filecache',
});

export const unpkgPathPlugin = () => {
  return {
    name: 'unpkg-path-plugin',
    setup(build: esbuild.PluginBuild) {
      /*
        onResolve is called whenever the building process is trying to figure it out
          where the file is stored
      */
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log('onResole', args);
        if (args.path === 'index.js') {
          return {
            namespace: 'a',
            path: args.path
          };
        }

        if (args.path.includes('./') || args.path.includes('../')) {
          return {
            namespace: 'a',
            path: new URL(
              args.path,
              'https://unpkg.com' + args.resolveDir + '/'
            ).href,
          };
        }

        return {
          namespace: 'a',
          path: `https://unpkg.com/${args.path}`,
        };
      });

      /*
        onLoad is called right after onResolve, and it pretty much attempts
          to load the file.
      */
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: `
              const message = require('react');
              console.log(message);
            `,
          };
        }

        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);

        if (cachedResult) return cachedResult;

        const { data, request } = await axios.get(args.path);

        const result: esbuild.OnLoadResult = {
          loader: 'jsx',
          contents: data,
          resolveDir: new URL('./', request.responseURL).pathname,
        };

        await fileCache.setItem(args.path, result);
        return result;
      });
    },
  };
};
