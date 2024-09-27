var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers');
const recipeHelpers = require('../helpers/recipe-helpers');

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

router.get('/submit-recipe', verifyLogin, async (req, res) => {
  try {
    const cuisines = await recipeHelpers.getCuisines();
    const user = req.session.user
    res.render('user/submit-recipe', { cuisines, user });
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

router.get('/recipe-submit-success', (req, res) => {
  const user = req.session.user
  res.render('user/recipe-submit-success', { user });
})

router.get('/view-your-recipes', verifyLogin, async (req, res) => {
  const user = req.session.user
  const recipes = await recipeHelpers.getRecipesByUser(user)

  // Filter based on status
  const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
  const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
  const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

  // res.send(publishedRecipes)

  res.render('user/user-view-user-recipes', { user, pendingRecipes, rejectedRecipes, publishedRecipes })
})
module.exports = router;