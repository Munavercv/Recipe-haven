var express = require('express');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const recipeHelpers = require('../helpers/recipe-helpers');
const { KeyObject } = require('crypto');
const fs = require('fs');
const dotenv = require('dotenv')
require('dotenv').config()
const crypto = require('crypto');
var path = require('path');



const getUsername = (user) => {
  let firstName = '';

  if (user && user.name) {
    firstName = user.name.split(' ')[0];
  }
  return firstName
}

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    // req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  }
}

const checkUserIsPro = async (user) => {
  let userIsPro = false
  let expiryDetails
  if (user && user.role === "pro") {
    expiryDetails = userHelpers.checkMembershipExpiry(user)
    if (expiryDetails.expired === false) {
      userIsPro = true
    }
  }
  return { userIsPro, expiryDetails }
}



/* GET home page. */
router.get('/', async function (req, res, next) {

  const user = req.session.user;
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const expiryDetails = (await membershipDetails).expiryDetails

  const cuisines = await recipeHelpers.getCuisines();
  const limit = 12;
  const latestRecipes = await recipeHelpers.getLatestRecipes(limit);

  res.render('user/user-home', {
    title: 'Recipe haven',
    user,
    latestRecipes,
    cuisines,
    firstName,
    userIsPro,
    expiryDetails
  });
});


// router.get('/404-error', (req, res) => {
//   res.render('user/404-page', { hideHeader: true, })
// })


// RECIPE

router.get('/submit-recipe', verifyLogin, async (req, res) => {
  const user = req.session.user;
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const expired = (await membershipDetails).expiryDetails.expired
  const userIsPro = (await membershipDetails).userIsPro

  if (user.role === 'user' || expired)
    res.redirect('/view-pricing')
  try {
    const cuisines = await recipeHelpers.getCuisines();
    const user = req.session.user
    res.render('user/submit-recipe', { cuisines, firstName, user, userIsPro });
  } catch (error) {
    console.error('Error fetching cuisines:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/submit-recipe', verifyLogin, (req, res) => {
  const user = req.session.user

  if (req.body.cuisine == '') {
    res.send('cuisine empty')
  }

  recipeHelpers.saveRecipe(req.body, user, (id) => {
    const image = req.files.image
    image.mv('./public/recipe_images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.redirect('/recipe-submit-success')
      }
    })
  })

})


router.get('/recipe-submit-success', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  res.render('user/recipe-submit-success', { user, firstName, userIsPro });
})


router.get('/view-your-recipes', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  const recipes = await recipeHelpers.getRecipesByUser(user)

  const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
  const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
  const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

  res.render('user/user-view-user-recipes', { user, pendingRecipes, rejectedRecipes, publishedRecipes, recipes, firstName, userIsPro })
})


router.get('/view-recipe/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];
  let recipeOwner = false
  let isBookmarked = false;
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  if (user && user._id == recipe.userId) {
    recipeOwner = true
  }

  if (user)
    isBookmarked = await recipeHelpers.isRecipeBookmarked(user._id, recipe._id);

  res.render('user/view-recipe', { user, recipe, recipeOwner, firstName, isBookmarked, userIsPro })
})


router.get('/search-results', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const keyword = req.query.keyword
  const searchResults = await recipeHelpers.searchRecipesByName(keyword)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  res.render('user/view-search-results', { title: 'search results', user, firstName, searchResults, keyword, userIsPro })
})


router.get('/edit-recipe/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];
  const cuisines = await recipeHelpers.getCuisines();
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  cuisines.forEach(cuisine => {
    cuisine.isSelected = cuisine.name === recipe.cuisine.name;
  });

  res.render('user/edit-recipe', { recipe, user, cuisines, firstName, userIsPro })
})


router.post('/edit-recipe/:id', verifyLogin, async (req, res) => {
  const id = req.params.id
  await userHelpers.updateRecipe(id, req.body)
  if (req.files && req.files.image) {
    let image = req.files.image
    if (fs.existsSync('./public/recipe_images/' + id + '.jpg')) {
      fs.unlinkSync('./public/recipe_images/' + id + '.jpg');
    }
    image.mv('./public/recipe_images/' + id + '.jpg')
  }
  res.redirect('/view-recipe/' + id);
})


router.get('/delete-recipe/:id', verifyLogin, async (req, res) => {
  const recipeId = req.params.id;
  await recipeHelpers.deleteRecipe(recipeId)
  const imagePath = path.join(__dirname, '../public/recipe_images/', recipeId + '.jpg');
  fs.unlink(imagePath, (err) => {
    if (err) {
      console.error("Error while deleting image:", err);
      return res.status(500).send('Failed to delete the image');
    }
  })
  res.redirect('/view-your-recipes')
})


router.post('/bookmark-recipe/:recipeId', verifyLogin, async (req, res) => {
  const userId = req.session.user._id;
  const recipeId = req.params.recipeId;

  try {
    await recipeHelpers.bookmarkRecipe(userId, recipeId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }

})


router.delete('/unbookmark-recipe/:recipeId', verifyLogin, async (req, res) => {
  const userId = req.session.user._id;
  const recipeId = req.params.recipeId;

  try {
    await recipeHelpers.unbookmarkRecipe(userId, recipeId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});


router.get('/bookmarks', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const bookmarks = await recipeHelpers.getBookmarks(user._id)
  res.render('user/view-bookmarks', { user, bookmarks, firstName, userIsPro })
})


router.get('/view-all-recipes', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const allRecipes = await recipeHelpers.getAllRecipes()
  res.render('user/view-all-recipes', { user, allRecipes, firstName, userIsPro })
})


router.get('/view-recipes-by-cuisine/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipesByCuisine(req.params.id)
  const cuisine = await recipeHelpers.getCuisine(req.params.id)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  res.render('user/view-recipes-by-cuisine', { user, recipes, cuisine, firstName, userIsPro })
})


router.get('/view-recipes-by-user/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const allRecipes = await recipeHelpers.getRecipesByUserId(req.params.id)
  // Filter based on status
  const recipes = allRecipes.filter(allRecipes => allRecipes.status === 'published');
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  res.render('user/view-recipes-by-user', { user, firstName, recipes, userIsPro })
})


router.post('/rate-recipe/:id', verifyLogin, async (req, res) => {
  const recipeId = req.params.id;
  // const user = req.session.user;
  const userId = req.session.user._id;
  const rating = req.body.rating;

  try {
    const result = await recipeHelpers.doRating(recipeId, userId, rating);
    res.json(result);
  } catch (error) {
    res.json({ success: false });
  }
});


// PROFILE

router.get('/view-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const userData = await userHelpers.getUserData(req.params.id)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const recipesCount = await recipeHelpers.getRecipeCount(req.params.id)
  if (userIsPro) {
    expiryDetails = userHelpers.checkMembershipExpiry(user)
  }
  res.render('user/view-profile', { userData, recipesCount, user, firstName, userIsPro, expiryDetails })
})


router.get('/delete-account/:id', verifyLogin, async (req, res) => {
  await userHelpers.deleteUser(req.params.id)
  res.redirect('/signup')
})


router.get('/edit-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const userData = await userHelpers.getUserData(req.params.id)
  res.render('user/edit-profile', { user, userData, firstName, userIsPro })
})


router.post('/edit-profile/:id', verifyLogin, async (req, res) => {
  try {
    await userHelpers.editUser(req.params.id, req.body)
    res.redirect('/view-profile/' + req.params.id)
  }
  catch {
    res.status(500).send('Error editing user');
  }
})


router.get('/view-other-user-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const id = req.params.id
  const userData = await userHelpers.getUserData(id)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro
  const recipesCount = await recipeHelpers.getRecipeCount(id)
  res.render('user/view-other-user-profile', { userData, recipesCount, user, firstName, userIsPro })
})


router.get('/view-pricing', verifyLogin, async (req, res) => {
  const user = req.session.user
  const membershipDetails = checkUserIsPro(user)
  const expiryDetails = (await membershipDetails).expiryDetails
  const userIsPro = (await membershipDetails).userIsPro
  const firstName = getUsername(user)
  res.render('user/view-pricing', { title: 'pricing', user, firstName, userIsPro, expiryDetails })
})


router.post('/create-order', verifyLogin, async (req, res) => {
  const userId = req.session.user._id
  const amount = req.body.value * 10000
  const order = await userHelpers.generateRazorpay(userId, amount)
  console.log(order.amount)
  res.json(order)
})


router.post('/verify-payment', verifyLogin, async (req, res) => {
  const { payment_id, order_id, signature, amount } = req.body;
  const userId = req.session.user._id
console.log(amount)
  // Generate the expected signature using Razorpay secret
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(order_id + "|" + payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === signature) {
    // Signature matches, the payment is successful
    console.log('Payment verified successfully');
    // Here, you would typically update the user's status in the database to "pro"
    try {
      const insertedId = await userHelpers.storePaymentDetails(userId, order_id, amount)
      const proUpgradeResult = await userHelpers.updateUserToPro(userId, insertedId, amount);
      req.session.user.role = 'pro'
      req.session.user.membershipExpiresAt = proUpgradeResult.membershipExpiresAt;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    };
  } else {
    // Signature verification failed
    console.log('Payment verification failed');
    res.json({ success: false, message: "Payment verification failed" });
  }
});


router.get('/payment-success', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const membershipDetails = checkUserIsPro(user)

  const userIsPro = (await membershipDetails).userIsPro

  res.render('user/payment-success', { user, firstName, userIsPro })
})


router.get('/payment-fail', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)

  res.render('user/payment-failed', { title: 'Payment', user, firstName })
})

module.exports = router;