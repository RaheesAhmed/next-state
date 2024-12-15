/// <reference types="tsup" />
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  external: ['react'],
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'browser';
    options.target = 'es2018';
    options.minify = true;
    options.treeShaking = true;
    options.legalComments = 'none';
    options.mangleProps = /^_/;
    options.drop = ['debugger', 'console'];
  },
});
