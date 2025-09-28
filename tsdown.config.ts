import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/**/*.ts'],
  format: 'esm',
  outDir: './build',
  dts: {
    tsconfig: './tsconfig.src.json',
  },
})
