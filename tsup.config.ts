/// <reference types="tsup" />
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  minify: true,
  treeshake: {
    preset: 'smallest',
  },
  external: ['react', 'next'],
  esbuildOptions(options) {
    options.bundle = true;
    options.minify = true;
    options.platform = 'browser';
    options.target = 'es2020';
    options.treeShaking = true;
  },
  sourcemap: true,
});
