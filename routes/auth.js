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
        req.session.user = response.user
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
  console.log('Validation success'); // Log on success

  req.body.role = "user";
  req.body.isVerified = false;

  const { email, password, confirmPassword } = req.body;

  try {
    const existingUser = await db.get().collection(collection.USERS_COLLECTION).findOne({ email: email });

    if (existingUser) {
      return res.json({ error: 'Email already exists' });
    }

    delete req.body.confirmPassword;
    await authHelpers.doSignup(req.body);
    console.log('success signin')
    res.json({ success: true, email: req.body.email });
    await authHelpers.sendOtp(req.body.email);

  } catch (error) {
    console.error('Error:', error);
    res.json({ error: 'Signup failed' });
  }

});

// OTP
router.get('/verify-otp', (req, res) => {
  const email = req.query.email;
  req.session.email = email;
  res.render('auth/otp-verification', { title: 'Verify OTP', hideHeader: true, email });
})

router.post('/verify-otp', async (req, res) => {
  const { otp, email } = req.body;
  const numOtp = parseInt(otp)
  // console.log(otp)
  const otpRecord = await db.get().collection(collection.OTP_COLLECTION).findOne({ email: email, otp: numOtp });
  if (!otpRecord) {
    // return res.send('invalid OTP');
    return res.json({ success: false, message: 'Invalid OTP' });
  }
  // return res.send(otpRecord);
  await authHelpers.verifyOTP(otpRecord)
    .then(response => {
      if (response.status) {
        // res.redirect('/login')
        return res.json({ success: true, message: 'Verification successful' });
      } else {
        // res.render('auth/otp-verification', { title: 'Verify Otp', hideHeader: true, error: response.message, email });
        return res.json({ success: false, message: response.message });
      }
    })
})

router.get('/resend-otp', async (req, res) => {
  const email = req.session.email;  // Retrieve email from session
  if (email) {
    await db.get().collection(collection.OTP_COLLECTION).deleteMany({ email: email });
    await authHelpers.sendOtp(email);  // Resend OTP
    res.redirect('/verify-otp?email=' + encodeURIComponent(email));
  } else {
    res.status(400).send('Email not found in session');
  }
});
// OTP


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

router.get('/logout', (req, res) => {
  const role = req.session.user.role
  req.session.destroy()
  if (role == 'admin')
    res.redirect('/login')
  else {
    res.redirect('/')
  }
})

module.exports = router;