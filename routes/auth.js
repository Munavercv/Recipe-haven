var express = require('express');
const authHelpers = require('../helpers/auth-helpers');
const db = require('../config/connection')
const collection = require('../config/collections');
const { response } = require('../app');
var router = express.Router();

// GET login page (common for both admin and user)
router.get('/login', function (req, res) {
  res.render('auth/login', { title: 'Login', hideHeader: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  authHelpers.doLogin(email, password)
    .then(response => {
      if (response.status) {
        req.session.loggedIn = true
        req.session.user = response.user.name
        // console.log(req.session.user);
        res.redirect(response.redirectUrl)
      } else {
        res.render('auth/login', { title: 'Login', hideHeader: true, error: response.message });
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      res.render('login', { error: 'Something went wrong, please try again' });
    });
})

// GET signup page (only for users)
router.get('/signup', function (req, res) {
  res.render('auth/signup', { title: 'Sign Up', hideHeader: true });
});

router.post('/signup', async (req, res) => {
  req.body.role = "user";
  req.body.isVerified = false;

  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.json({ error: 'Passwords do not match' });
  }

  try {
    const existingUser = await db.get().collection(collection.USERS_COLLECTION).findOne({ email: email });

    if (existingUser) {
      return res.json({ error: 'Email already exists' });
    }

    delete req.body.confirmPassword;
    await authHelpers.doSignup(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.json({ error: 'Signup failed' });
  }
  
});


router.get('/verify-otp', (req, res) => {
  res.render('auth/otp-verification', { title: 'Verify OTP', hideHeader: true });
})

router.get('/logout', (req, res) => {
  req.session.destroy() //destroy session if logout clicked
  res.redirect('/login')
})

module.exports = router;