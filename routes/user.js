var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
// const userHelpers = require('../helpers/user-helpers');
const { response } = require('../app');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('user/user-home', { title: 'Recipe haven', });

});

module.exports = router;