const webpack = require('webpack');

module.exports = function override(config, env) {
  // Polyfills de Node para Webpack 5
  config.resolve.fallback = {
    ...config.resolve.fallback,
    process: require.resolve('process/browser.js'), // <-- con .js
    buffer: require.resolve('buffer'),
  };

  // Alias por si algún import usa 'process/browser'
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    process: 'process/browser.js',
  };

  // Relajar fullySpecified para ESM en node_modules (opcional pero útil)
  config.module.rules = [
    ...(config.module.rules || []),
    {
      test: /\.m?js$/,
      resolve: { fullySpecified: false },
    },
  ];

  // Inyectar process y Buffer globales
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  // Ignorar warnings de sourcemaps
  config.ignoreWarnings = [/Failed to parse source map/];

  // Build bajo en memoria (LOW_MEM_BUILD=true): quita el type-checker que corre
  // en proceso aparte (validar antes con `npx tsc --noEmit`) y minifica sin
  // workers paralelos. Para máquinas con poca RAM libre donde el build muere
  // con OOM/segfault sin mensaje.
  if (process.env.LOW_MEM_BUILD === 'true') {
    config.plugins = config.plugins.filter(
      (p) => p.constructor.name !== 'ForkTsCheckerWebpackPlugin'
    );
    for (const m of (config.optimization && config.optimization.minimizer) || []) {
      if (m && m.options) m.options.parallel = false;
    }
    config.parallelism = 4;
  }

  return config;
};
