/* eslint-disable */
module.exports = function(ctx) {
  return {
    plugins: {
      'postcss-smart-import': { addDependencyTo: ctx.webpack },
      'postcss-simple-vars': {},      // https://github.com/postcss/postcss-simple-vars | Simple variables in css
      'autoprefixer': {},           
      'postcss-assets': {             // https://github.com/assetsjs/postcss-assets | Asset management in CSS
        basePath: 'src/',
        loadPaths: [
          'assets/fonts/',
          'assets/images/',
        ]
      },
      'postcss-calc': {},             // https://github.com/postcss/postcss-calc | Reduces calcs by collapsing them
      'postcss-nested-ancestors': {}, // https://github.com/toomuchdesign/postcss-nested-ancestors | Allows for ^& parent selection
      'postcss-nested': {},           // https://github.com/postcss/postcss-nested | Nested css like SASS
    }
  }
}

/* 
[For review]
  CSS minifying - https://github.com/ben-eb/cssnano
*/

