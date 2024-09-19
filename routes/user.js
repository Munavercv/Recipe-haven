var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers');
const { response } = require('../app');

let verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/user-home', verifyLogin, function (req, res, next) {
  res.render('user/user-home', { title: 'Recipe haven', })
});

module.exports = router;