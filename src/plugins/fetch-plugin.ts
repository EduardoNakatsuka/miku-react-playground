import axios from 'axios';
import * as esbuild from 'esbuild-wasm';
import localForage from 'localforage';

const fileCache = localForage.createInstance({
  name: 'filecache',
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: 'fetch-plugin',
    setup(build: esbuild.PluginBuild) {
      /*
        onLoad is called right after onResolve, and it pretty much attempts
          to load the file.
      */
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: inputCode,
          };
        }

        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);

        if (cachedResult) return cachedResult;

        const { data, request } = await axios.get(args.path);

        const fileType = args.patch.match(/.css$/)
          ? 'css'
          : 'jsx';

        const escapedCss = data
          .replace(/\n/g, '') // new lines
          .replace(/"/g, '') // double quotes
          .replace(/'/g, ''); // single quotes

        const contents = fileType === 'css'
          ? `
            const style = document.createElement('style');
            style.innerText = '${escapedCss}'
            document.head.appendChild(style);
          `
          : data;

        const result: esbuild.OnLoadResult = {
          loader: 'jsx',
          contents,
          resolveDir: new URL('./', request.responseURL).pathname,
        };

        await fileCache.setItem(args.path, result);
        return result;
      });
    }
  };
};