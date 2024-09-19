var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
// const adminHelpers = require('../helpers/admin-helpers')
const { response } = require('../app');

let verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next()
    } else {
        res.redirect('/login')
    }
}

/* GET users listing. */
router.get('/admin-home', verifyLogin, function (req, res, next) {
    res.render('admin/admin-home', { title: 'admin panel', admin: true })
});

module.exports = router;
