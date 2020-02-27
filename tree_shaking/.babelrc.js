module.exports = {
  presets: [
    [
      '@babel/env'
    ]
  ],
  plugins: [
    [
      'transform-imports',
      {
        lodash: {
          transform: 'lodash/${member}',
          preventFullImport: true
        }
      }
    ]
  ]
};
