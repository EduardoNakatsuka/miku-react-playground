import ReactDom from 'react-dom';
import * as esbuild from 'esbuild-wasm';
import { useEffect, useRef, useState } from 'react';
import { unpkgPathPlugin } from './plugins/unpk-path-plugin';

const App = () => {
  const ref = useRef<any>();
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');

  const startService = async () => {
    ref.current = await esbuild.startService({
      worker: true,
      wasmURL: '/esbuild.wasm'
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
      plugins: [unpkgPathPlugin(input)],
      define: {
        'process.env.NODE_ENV': '"production"',
        global: 'window',
      },
    });

    setCode(result.code);
  };

  return (
    <div>
      <textarea value={input} onChange={e => setInput(e.target.value)} />

      <div>
        <button onClick={transpileCode}>Submit</button>
      </div>

      <pre>{code}</pre>
    </div>
  )
};

ReactDom.render(
  <App />,
  document.querySelector('#root')
);