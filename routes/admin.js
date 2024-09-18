var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
// const adminHelpers = require('../helpers/admin-helpers')
const { response } = require('../app');

// const verifyLogin = (req, res, next) => {
//   if (req.session.loggedIn) {
//     next()
//   } else {
//     res.redirect('/admin/admin-login')
//   }
// }

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.render('admin/admin-home', { title: 'admin panel', admin:true })
});

module.exports = router;
