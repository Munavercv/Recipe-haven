const express = require('express');
const authHelpers = require('../helpers/auth-helpers');
const db = require('../config/connection')
const collection = require('../config/collections');
const router = express.Router();
const passport = require('passport');
const { response } = require('../app');
require('../passport')
router.use(passport.initialize());
router.use(passport.session());

// GET login page (common for both admin and user)
router.get('/login', function (req, res) {
  const error = req.session.error || null; // Get error message from session
  req.session.error = null; // Clear the error message for the next request
  res.render('auth/login', { title: 'Login', hideHeader: true, error });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  authHelpers.doLogin(email, password)
    .then(response => {
      if (response.status) {
        req.session.loggedIn = true
        req.session.user = response.user

        // const redirectTo = req.session.returnTo || response.redirectUrl;
        // delete req.session.returnTo;
        // res.redirect(redirectTo);

        res.redirect(response.redirectUrl)
      } else {
        req.session.error = response.message; // Store the error in session
        res.redirect('/login'); // Redirect to login page
      }
    })
    .catch(error => {
      req.session.error = 'Invalid username or password'; // Store the error in session
      res.redirect('/login'); // Redirect to login page
    });
})



/** SIGNUP */
router.get('/signup', function (req, res) {
  res.render('auth/signup', { title: 'Sign Up', hideHeader: true });
});

router.post('/signup', async (req, res) => {
  console.log('Validation success'); // Log on success

  req.body.role = "user";
  req.body.isVerified = false;

  const { email } = req.body;

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
  const otpRecord = await db.get().collection(collection.OTP_COLLECTION).findOne({ email: email, otp: numOtp });
  if (!otpRecord) {
    return res.json({ success: false, message: 'Invalid OTP' });
  }
  await authHelpers.verifyOTP(otpRecord)
    .then(response => {
      if (response.status) {
        return res.json({ success: true, message: 'Verification successful' });
      } else {
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


router.get('/signup-successfull', (req, res) => {
  res.render('auth/signup-success', { title: 'Signup successfull', hideHeader: true })
})


router.get('/success', (req, res) => {
  if (!req.user)
    res.redirect('/failure');
  res.send("Welcome " + req.user.email);
})

router.get('/failure', (req, res) => {
  res.send("Error");
})

router.get('/logout', (req, res) => {
  const userRole = req.session.user ? req.session.user.role : null;

  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }

    if (userRole === 'admin') {
      res.redirect('/login');
    } else {
      res.redirect('/');
    }
  });
});


module.exports = router;