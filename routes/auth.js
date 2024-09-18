var express = require('express');
const userHelpers = require('../helpers/user-helpers');
const db = require('../config/connection')
const collection = require('../config/collections')
var router = express.Router();

// GET login page (common for both admin and user)
router.get('/login', function (req, res) {
  res.render('auth/login', { title: 'Login', hideHeader: true });
});

// GET signup page (only for users)
router.get('/signup', function (req, res) {
  res.render('auth/signup', { title: 'Sign Up', hideHeader: true });
});

// router.post('/signup', async (req, res) => {
//   req.body.role = "user";
//   req.body.isVerified = false;
//   const { password, confirmPassword } = req.body;
//   if (password !== confirmPassword) {
//     return res.json({ error: 'Passwords do not match' });
//   }

//   try {
//     // Check if email already exists
//     const existingUser = await db.get().collection(collection.USERS_COLLECTION).findOne({ email: email });

//     if (existingUser) {
//       return res.json({ error: 'Email already exists' });
//     }

//     // Proceed with user creation
//     delete req.body.confirmPassword;
//     const userId = await userHelpers.doSignup(req.body);
//     res.json({ success: true }); // Indicate success in JSON
//   } catch (error) {
//     res.json({ error: 'Signup failed' });
//   }
// })

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
    await userHelpers.doSignup(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.json({ error: 'Signup failed' });
  }
});


router.get('/verify-otp', (req, res) => {
  res.render('auth/otp-verification', { title: 'Verify OTP', hideHeader: true })
})

module.exports = router;