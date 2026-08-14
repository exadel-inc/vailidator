const path = require('node:path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/client/loader.ts',
  output: {
    path: path.resolve(__dirname, 'dist-ui'),
    filename: 'loader.js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
            },
          },
        },
      },
    ],
  },
  devtool: 'source-map',
};
