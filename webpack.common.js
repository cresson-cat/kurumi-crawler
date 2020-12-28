module.exports = {
  target: 'node',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
    extensions: [
      '.ts', '.js',
    ],
    // Webpack5以降で発生する警告を無視
    fallback: {
      'canvas': false,
      'bufferutil': false,
      'utf-8-validate': false,
    }
  },
  performance: {
    hints: false // パフォーマンスの警告を抑止
  }
};
