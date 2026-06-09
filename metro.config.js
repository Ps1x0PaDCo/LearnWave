const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. ИСПРАВЛЕНО: Разрешаем Metro Bundler импортировать файлы WebAssembly (.wasm)
config.resolver.assetExts.push('wasm');

// 2. ИСПРАВЛЕНО: Добавляем CORS и COEP заголовки для корректной работы SharedArrayBuffer в браузере
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
