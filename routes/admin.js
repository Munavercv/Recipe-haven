var express = require('express');
var router = express.Router();
const recipeHelpers = require('../helpers/recipe-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');


const verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next()
    } else {
        res.redirect('/login');
    }
}

/* GET users listing. */
router.get('/admin-home', verifyLogin, function (req, res, next) {
    const user = req.session.user
    res.render('admin/admin-home', { user, title: 'admin panel', admin: true })
});


router.get('/user-recipes', verifyLogin, async (req, res) => {
    const user = req.session.user
    const recipes = await adminHelpers.getUserRecipes()
    const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
    const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
    // const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');
    const recentlyPublishedRecipes = recipes
        .filter(recipe => recipe.status === 'published')
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 8);

    res.render('admin/user-recipes', { user, title: 'User recipes', admin: true, pendingRecipes, rejectedRecipes, recentlyPublishedRecipes })
});

router.get('/view-recipe/:id', verifyLogin, async (req, res) => {
    const user = req.session.user
    const recipes = await recipeHelpers.getRecipe(req.params.id)
    const recipe = recipes[0];

    res.render('admin/view-recipe', { user, recipe, admin: true, title: recipe.name })
})

router.get('/publish-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.publishRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})

router.get('/unpublish-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.unpublishRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})

router.get('/reject-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.rejectRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})

router.get('/delete-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.deleteRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})

router.get('/edit-recipe/:id', verifyLogin, async (req, res) => {
    const recipes = await recipeHelpers.getRecipe(req.params.id)
    const recipe = recipes[0];
    const cuisines = await recipeHelpers.getCuisines();
    res.render('admin/edit-recipe', { recipe, admin: true, cuisines })
})

router.post('/edit-recipe/:id', verifyLogin, async (req, res) => {
    const id = req.params.id
    // req.body.userRole = req.session.user.role
    // console.log(req.body.userRole)
    await adminHelpers.updateRecipe(id, req.body)
    if (req.files && req.files.image) {
        let image = req.files.image
        image.mv('./public/recipe_images/' + id + '.jpg')
    }
    res.redirect('/admin/view-recipe/' + id);
})

router.get('/view-users', async (req, res) => {
    const users = await userHelpers.getUsers()
    res.render('admin/view-users', { admin: true, users })
})

router.get('/view-user-profile/:id', async (req, res) => {
    const userData = await userHelpers.getUserData(req.params.id)
    const recipesCount = await recipeHelpers.getRecipeCount(req.params.id)
    console.log(recipesCount)
    res.render('admin/user-profile', { admin: true, userData, recipesCount })
})

router.get('/view-recipes-by-user/:id', async (req, res) => {
    const recipes = await recipeHelpers.getRecipesByUserId(req.params.id)
    // Filter based on status
    const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
    const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
    const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

    res.render('admin/recipes-by-user', { admin: true, pendingRecipes, rejectedRecipes, publishedRecipes, recipes })
})

router.get('/delete-user/:id', async (req, res) => {
    await userHelpers.deleteUser(req.params.id)
    res.redirect('/admin/view-users')
})

router.get('/edit-profile/:id', async (req, res) => {
    const userData = await userHelpers.getUserData(req.params.id)
    res.render('admin/edit-user-profile', { admin: true, userData })
})

router.post('/edit-profile/:id', async (req, res) => {
    try {
        await userHelpers.editUser(req.params.id, req.body)
        res.redirect('/admin/view-users')
    }
    catch{
        res.status(500).send('Error editing user');
    }
})

module.exports = router;