var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', function (req, res, next) {
  const user = req.session.user
  res.render('user/user-home', { title: 'Recipe haven', user })
});

router.get('/404-error', (req, res) => {
  res.render('user/404-page', { title: 'Login', hideHeader: true, })
})

router.get('/submit-recipe', (req, res) => {
  res.render('user/submit-recipe')
})

module.exports = router;