import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  input: 'build/src/index.js',
  output: {
    file: 'build/vega-ar.js',
    format: 'umd',
    name: "vegaAR",
    sourcemap: true,
    globals: {
      vega: 'vega'
    }
  },
  plugins: [nodeResolve(), json()],
  external: ['vega']
};
