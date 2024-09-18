var express = require('express');
var router = express.Router();

// GET login page (common for both admin and user)
router.get('/login', function(req, res) {
  res.render('auth/login', { title: 'Login',hideHeader: true });
});

// GET signup page (only for users)
router.get('/signup', function(req, res) {
  res.render('auth/signup', { title: 'Sign Up', hideHeader: true });
});

router.get('/verify-otp', (req, res)=>{
  res.render('auth/otp-verification', {title:'Verify OTP', hideHeader: true})
})

module.exports = router;