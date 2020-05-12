import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  input: 'build/src/ar.js',
  output: {
    file: 'build/vega-ar-backend.js',
    format: 'cjs',
    sourcemap: true,
    globals: {
      vega: 'vega'
    }
  },
  plugins: [nodeResolve(), json()],
  external: ['vega']
};
