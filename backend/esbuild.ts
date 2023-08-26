import { build } from 'esbuild';
import {glob} from "glob";

(async function () {
  // Get all ts files
  const entryPoints = await glob('src/**/*.ts')

  build({
    entryPoints,
    logLevel: 'info',
    outdir: 'dist',
    bundle: true,
    minify: true,
    platform: 'node',
    format: 'cjs',
    sourcemap: true,
    plugins: [
    ]
  })
})()
