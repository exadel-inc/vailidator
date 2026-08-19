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
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'src/client/tsconfig.json'),
            compilerOptions: {
              noEmit: false,
            },
          },
        },
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: 'css-loader',
            options: { exportType: 'string' },
          },
          'less-loader',
        ],
      },
    ],
  },
  devtool: 'source-map',
};
