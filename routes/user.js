var express = require('express');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const recipeHelpers = require('../helpers/recipe-helpers');
const { KeyObject } = require('crypto');
const fs = require('fs');

let getUsername = (user) => {
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
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {

  const user = req.session.user;
  const firstName = getUsername(user)

  const cuisines = await recipeHelpers.getCuisines();
  const limit = 12;
  const latestRecipes = await recipeHelpers.getLatestRecipes(limit);

  res.render('user/user-home', {
    title: 'Recipe haven',
    user,
    latestRecipes,
    cuisines,
    firstName
  });
});


// router.get('/404-error', (req, res) => {
//   res.render('user/404-page', { hideHeader: true, })
// })


// RECIPE

router.get('/submit-recipe', verifyLogin, async (req, res) => {
  const user = req.session.user;
  const firstName = getUsername(user)
  try {
    const cuisines = await recipeHelpers.getCuisines();
    const user = req.session.user
    res.render('user/submit-recipe', { cuisines, firstName, user });
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


router.get('/recipe-submit-success', verifyLogin, (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)

  res.render('user/recipe-submit-success', { user, firstName });
})


router.get('/view-your-recipes', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)

  const recipes = await recipeHelpers.getRecipesByUser(user)

  const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
  const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
  const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

  res.render('user/user-view-user-recipes', { user, pendingRecipes, rejectedRecipes, publishedRecipes, recipes, firstName })
})


router.get('/view-recipe/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];
  let recipeOwner = false
  let isBookmarked = false;

 if (user && user._id == recipe.userId) {
    recipeOwner = true
  }

  isBookmarked = await recipeHelpers.isRecipeBookmarked(user._id, recipe._id);

  res.render('user/view-recipe', { user, recipe, recipeOwner, firstName, isBookmarked })
})


router.get('/search-results', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const keyword = req.query.keyword
  const searchResults = await recipeHelpers.searchRecipesByName(keyword)
  res.render('user/view-search-results', { title: 'search results', user, firstName, searchResults, keyword })
})


router.get('/edit-recipe/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipe(req.params.id)
  const recipe = recipes[0];
  const cuisines = await recipeHelpers.getCuisines();

  cuisines.forEach(cuisine => {
    cuisine.isSelected = cuisine.name === recipe.cuisine.name;
  });

  res.render('user/edit-recipe', { recipe, user, cuisines, firstName })
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
  const imagePath = path.join(__dirname, '../public/recipe_images/', id + '.jpg');
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


router.get('/bookmarks', verifyLogin, async (req, res) =>{
  const user = req.session.user
  const firstName = getUsername(user)
  const bookmarks = await recipeHelpers.getBookmarks(user._id)
  res.render('user/view-bookmarks', {user, bookmarks, firstName})
})


router.get('/view-all-recipes', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const allRecipes = await recipeHelpers.getAllRecipes()
  res.render('user/view-all-recipes', { user, allRecipes, firstName })
})


router.get('/view-recipes-by-cuisine/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const recipes = await recipeHelpers.getRecipesByCuisine(req.params.id)
  const cuisine = await recipeHelpers.getCuisine(req.params.id)

  res.render('user/view-recipes-by-cuisine', { user, recipes, cuisine, firstName })
})


router.get('/view-recipes-by-user/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const allRecipes = await recipeHelpers.getRecipesByUserId(req.params.id)
  // Filter based on status
  const recipes = allRecipes.filter(allRecipes => allRecipes.status === 'published');

  res.render('user/view-recipes-by-user', { user, firstName, recipes })
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
      console.error(error);
      res.json({ success: false });
  }
});


// PROFILE

router.get('/view-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const userData = await userHelpers.getUserData(req.params.id)
  const recipesCount = await recipeHelpers.getRecipeCount(req.params.id)
  res.render('user/view-profile', { userData, recipesCount, user, firstName })
})


router.get('/delete-account/:id', verifyLogin, async (req, res) => {
  await userHelpers.deleteUser(req.params.id)
  res.redirect('/signup')
})


router.get('/edit-profile/:id', verifyLogin, async (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  const userData = await userHelpers.getUserData(req.params.id)
  res.render('user/edit-profile', { user, userData, firstName })
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
  const recipesCount = await recipeHelpers.getRecipeCount(id)
  res.render('user/view-other-user-profile', { userData, recipesCount, user, firstName })
})


router.get('/view-pricing', verifyLogin, (req, res) => {
  const user = req.session.user
  const firstName = getUsername(user)
  res.render('user/view-pricing', { title: 'pricing', user, firstName })
})


module.exports = router;