import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    plugins: [
        react(),
        viteSingleFile(),
        wasm(),
        topLevelAwait()
    ],
    build: {
        minify: true,
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
    }
});
