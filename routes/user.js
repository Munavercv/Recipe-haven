var express = require('express');
var router = express.Router();
// const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers');
const recipeHelpers = require('../helpers/recipe-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const { KeyObject } = require('crypto');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  const user = req.session.user
  const cuisines = await recipeHelpers.getCuisines()
  const limit = 12
  const latestRecipes = await recipeHelpers.getLatestRecipes(limit)
  res.render('user/user-home', { title: 'Recipe haven', user, latestRecipes, cuisines })
});

// router.get('/404-error', (req, res) => {
//   res.render('user/404-page', { hideHeader: true, })
// })

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

  res.render('user/user-view-user-recipes', { user, pendingRecipes, rejectedRecipes, publishedRecipes, recipes })
})

router.get('/view-recipe/:id', async (req, res) => {
  const user = req.session.user
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];

  let recipeOwner = false

  if (user && user._id == recipe.userId) {
    recipeOwner = true
  }

  res.render('user/view-recipe', { user, recipe, recipeOwner })
})

router.get('/search-results', async (req, res) => {
  const user = req.session.user
  const keyword = req.query.keyword
  const searchResults = await recipeHelpers.searchRecipesByName(keyword)
  // console.log(searchResults)
  res.render('user/view-search-results', { title: 'search results', user, searchResults, keyword })
})

router.get('/edit-recipe/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];
  const cuisines = await recipeHelpers.getCuisines();

  cuisines.forEach(cuisine => {
    cuisine.isSelected = cuisine.name === recipe.cuisine.name;
  });

  res.render('user/edit-recipe', { recipe, user, cuisines })
})

router.post('/edit-recipe/:id', verifyLogin, async (req, res) => {
  const id = req.params.id
  // req.body.userRole = req.session.user.role
  // console.log(req.body.userRole)
  await userHelpers.updateRecipe(id, req.body)
  if (req.files && req.files.image) {
    let image = req.files.image
    image.mv('./public/recipe_images/' + id + '.jpg')
  }
  res.redirect('/view-recipe/' + id);
})

router.get('/delete-recipe/:id', verifyLogin, async (req, res) => {
  const recipeId = req.params.id;
  await recipeHelpers.deleteRecipe(recipeId)
  res.redirect('/view-your-recipes')
})

router.get('/view-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const userData = await userHelpers.getUserData(req.params.id)
  const recipesCount = await recipeHelpers.getRecipeCount(req.params.id)
  // console.log(recipesCount)
  res.render('user/view-profile', { userData, recipesCount, user })
})

router.get('/delete-account/:id', verifyLogin, async (req, res) => {
  await userHelpers.deleteUser(req.params.id)
  res.redirect('/signup')
})

router.get('/view-all-recipes', async (req, res) => {
  const user = req.session.user
  const allRecipes = await recipeHelpers.getAllRecipes()
  res.render('user/view-all-recipes', { user, allRecipes })
})

router.get('/view-recipes-by-cuisine/:id', async (req, res) => {
  const user = req.session.user
  const recipes = await recipeHelpers.getRecipesByCuisine(req.params.id)
  const cuisine = await recipeHelpers.getCuisine(req.params.id)

  res.render('user/view-recipes-by-cuisine', { user, recipes, cuisine })
})

router.get('/edit-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const userData = await userHelpers.getUserData(req.params.id)
  res.render('user/edit-profile', { user, userData })
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

router.get('/view-pricing', (req, res) => {
  const user = req.session.user
  res.render('user/view-pricing', { title: 'pricing', user })
})

module.exports = router;