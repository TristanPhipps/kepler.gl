// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import esbuild from 'esbuild';
import copyPlugin from 'esbuild-plugin-copy';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv;
const port = 8086;

const config = {
  platform: 'browser',
  format: 'iife',
  logLevel: 'info',
  loader: {'.js': 'jsx', '.css': 'css'},
  entryPoints: ['src/app.tsx'],
  outfile: 'dist/bundle.js',
  bundle: true,
  define: {
    NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.MapboxAccessToken': JSON.stringify(''),
    'process.env.MapboxExportToken': JSON.stringify(''),
    'process.env.CartoClientId': JSON.stringify(''),
    'process.env.DropboxClientId': JSON.stringify(''),
    'process.env.FoursquareClientId': JSON.stringify(''),
    'process.env.FoursquareDomain': JSON.stringify(''),
    'process.env.FoursquareAPIURL': JSON.stringify(''),
    'process.env.FoursquareUserMapsURL': JSON.stringify(''),
    'process.env.OpenAIToken': JSON.stringify(''),
    'process.env.NODE_DEBUG': JSON.stringify(false)
  },
  plugins: [
    {
      name: 'dedupe-singletons',
      setup(build) {
        build.onResolve({filter: /^(styled-components|react$|react-dom$)/}, async args => {
          if (args.pluginData?.deduped) return;
          return build.resolve(args.path, {
            resolveDir: __dirname,
            kind: args.kind,
            pluginData: {deduped: true}
          });
        });
      }
    },
    copyPlugin({resolveFrom: 'cwd', assets: {from: ['src/index.html'], to: ['dist']}})
  ]
};

if (args.includes('--build')) {
  const result = await esbuild.build({...config, minify: true, metafile: true});
  fs.writeFileSync('dist/esbuild-metadata.json', JSON.stringify(result.metafile));
}

if (args.includes('--start')) {
  const context = await esbuild.context({
    ...config,
    minify: false,
    sourcemap: true,
    banner: {js: `new EventSource('/esbuild').addEventListener('change', () => location.reload());`}
  });
  await context.watch();
  await context.serve({servedir: 'dist', port, fallback: 'dist/index.html'});
  console.info(`Cinema dashboard running at http://localhost:${port}`);
}
