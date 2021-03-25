import ReactDom from 'react-dom';
import * as esbuild from 'esbuild-wasm';
import { useEffect, useRef, useState } from 'react';
import { unpkgPathPlugin } from './plugins/unpk-path-plugin';
import { fetchPlugin } from './plugins/fetch-plugin';

const App = () => {
  const ref = useRef<any>();
  const iframe = useRef<any>();
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');

  const startService = async () => {
    ref.current = await esbuild.startService({
      worker: true,
      wasmURL: '/esbuild.wasm' // wasmURL: 'https://unpkg.com/esbuild-wasm@0.8.27/esbuild.wasm' Could also use this but
    });
  };

  useEffect(() => {
    startService();
  }, []);

  const transpileCode = async () => {
    if (!ref.current) return;

    const result = await ref.current.build({
      entryPoints: ['index.js'],
      bundle: true,
      write: false,
      plugins: [
        unpkgPathPlugin(),
        fetchPlugin(input)
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
        global: 'window',
      },
    });

    // setCode(result.outputFiles[0].text);

    iframe.current.contentWindow.postMessage(result.outputFiles[0].text, '*');
  };

  const html = `
    <html>
      <head></head>
      <body>
        <div id="root"></div>
        <script>
          window.addEventListener('message', (event) => {
            try {
              eval(event.data);
            } catch (err) {
              const root = document.querySelector('#root');
              root.innerHTML = '<div style="color: red;"><h4>Runtime Error</h4>' + err + '</div>';
              console.error(err);
            }
          }, false);
        </script>
      </body>
    </html>
  `;

  return (
    <div>
      <textarea value={input} onChange={e => setInput(e.target.value)} />

      <div>
        <button onClick={transpileCode}>Submit</button>
      </div>

      <pre>{code}</pre>

      <iframe ref={iframe} sandbox="allow-scripts" srcDoc={html} />
    </div>
  )
};

ReactDom.render(
  <App />,
  document.querySelector('#root')
);