var express = require('express');
const authHelpers = require('../helpers/auth-helpers');
const userHelpers = require('../helpers/user-helpers');
const db = require('../config/connection')
const collection = require('../config/collections');
var router = express.Router();
const passport = require('passport')
require('../passport')
router.use(passport.initialize());
router.use(passport.session());

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

router.get('/google-auth', passport.authenticate('google', {
  scope:
    ['email', 'profile']
}))

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/failure'
  }),
  async (req, res) => {
    if (!req.user) {
      return res.redirect('/failure');
    }

    const googleUserData = {
      name: req.user.displayName,
      email: req.user.emails[0].value,
      mobile: '',
      password: '',
      role: 'user',
      isVerified: true,
    };

    try {
      const existingUser = await authHelpers.findUserByEmail(googleUserData.email);

      if (existingUser) {
        req.session.loggedIn = true
        return res.redirect('/');
      } else {
        await authHelpers.doGoogleSignup(googleUserData);
        req.session.loggedIn = true
        return res.redirect('/');
      }
    } catch (error) {
      console.error('Error during Google authentication:', error);
      return res.redirect('/failure');
    }
  }
);


router.get('/success', (req, res) => {
  if (!req.user)
    res.redirect('/failure');
  res.send("Welcome " + req.user.email);
})

router.get('/failure', (req, res) => {
  res.send("Error");
})

module.exports = router;