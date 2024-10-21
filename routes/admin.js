var express = require('express');
var router = express.Router();
const recipeHelpers = require('../helpers/recipe-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
var path = require('path');
const fs = require('fs');
const { title } = require('process');


const verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next()
    } else {
        res.redirect('/login');
    }
}

/* Home */
router.get('/admin-home', verifyLogin, async function (req, res, next) {
    const cuisines = await recipeHelpers.getCuisines()
    const limit = 20
    const latestRecipes = await recipeHelpers.getLatestRecipes(limit)
    res.render('admin/admin-home', { title: 'admin panel', admin: true, cuisines, latestRecipes })
});

router.get('/dashboard', verifyLogin, async (req, res) => {
    const publishedRecipesCount = await recipeHelpers.getPublishedRecipesCount()
    const pendingRecipesCount = await recipeHelpers.getPendingRecipesCount()
    const totalCuisines = await recipeHelpers.getCuisineCount()
    const usersCount = await userHelpers.getUserCount()
    const membersCount = await userHelpers.getMembersCount()

    res.render('admin/dashboard', { admin: true, publishedRecipesCount, pendingRecipesCount, totalCuisines, usersCount, membersCount })
})


/** Recipes */

router.get('/view-all-recipes', verifyLogin, async (req, res) => {
    const allRecipes = await recipeHelpers.getAllRecipes()
    res.render('admin/view-all-recipes', { admin: true, allRecipes })
})


router.get('/view-recipes-by-cuisine/:id', verifyLogin, async (req, res) => {
    const recipes = await recipeHelpers.getRecipesByCuisine(req.params.id)
    const cuisine = await recipeHelpers.getCuisine(req.params.id)

    res.render('admin/view-recipes-by-cuisine', { admin: true, recipes, cuisine })
})


router.get('/user-recipes', verifyLogin, async (req, res) => {
    const recipes = await adminHelpers.getUserRecipes()
    const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending')
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
    const recentlyPublishedRecipes = recipes
        .filter(recipe => recipe.status === 'published')
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 8);

    res.render('admin/user-recipes', { title: 'User recipes', admin: true, pendingRecipes, rejectedRecipes, recentlyPublishedRecipes })
});


router.get('/view-recipe/:id', verifyLogin, async (req, res) => {
    const user = req.session.user
    const recipes = await recipeHelpers.getRecipe(req.params.id)
    const recipe = recipes[0];

    let recipeOwner = false

    if (user && user._id == recipe.userId) {
        recipeOwner = true
    }

    recipe.isPending = recipe.status === 'pending';
    recipe.isRejected = recipe.status === 'rejected';
    recipe.isPublished = recipe.status === 'published';

    res.render('admin/view-recipe', { user, recipe, admin: true, title: recipe.name, recipeOwner })
})


router.get('/publish-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.publishRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})


router.get('/unpublish-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.unpublishRecipe(recipeId)
    res.redirect('/admin/user-recipes/')
})


router.get('/reject-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.rejectRecipe(recipeId)
    res.redirect('/admin/user-recipes')
})


router.get('/delete-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await recipeHelpers.deleteRecipe(recipeId)
    const imagePath = path.join(__dirname, '../public/recipe_images/', req.params.id + '.jpg');
    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error("Error while deleting image:", err);
            return res.status(500).send('Failed to delete the image');
        }
    })
    res.redirect('/admin/user-recipes')
})


router.get('/edit-recipe/:id', verifyLogin, async (req, res) => {
    const recipes = await recipeHelpers.getRecipe(req.params.id)
    const recipe = recipes[0];
    const cuisines = await recipeHelpers.getCuisines();

    cuisines.forEach(cuisine => {
        cuisine.isSelected = cuisine.name === recipe.cuisine.name;
    });

    res.render('admin/edit-recipe', { recipe, admin: true, cuisines })
})


router.post('/edit-recipe/:id', verifyLogin, async (req, res) => {
    const id = req.params.id
    // req.body.userRole = req.session.user.role
    // console.log(req.body.userRole)
    await adminHelpers.updateRecipe(id, req.body)
    if (req.files && req.files.image) {
        let image = req.files.image
        if (fs.existsSync('./public/recipe_images/' + id + '.jpg')) {
            fs.unlinkSync('./public/recipe_images/' + id + '.jpg');
        }
        image.mv('./public/recipe_images/' + id + '.jpg')
    }
    res.redirect('/admin/view-recipe/' + id);
})


router.get('/submit-recipe', verifyLogin, async (req, res) => {
    try {
        const cuisines = await recipeHelpers.getCuisines();
        res.render('admin/submit-recipe', { cuisines, admin: true });
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
                res.redirect('/admin/recipe-submit-success')
            }
        })
    })

})


router.get('/recipe-submit-success', verifyLogin, (req, res) => {
    res.render('admin/recipe-submit-success', { admin: true });
})


router.get('/view-your-recipes', verifyLogin, async (req, res) => {
    const user = req.session.user
    const recipes = await recipeHelpers.getRecipesByUser(user)

    const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
    const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

    res.render('admin/view-your-recipes', { recipes, pendingRecipes, publishedRecipes, admin: true })
})


router.get('/publish-admin-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.publishRecipe(recipeId)
    res.redirect('/admin/view-your-recipes')
})


router.get('/unpublish-admin-recipes/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await adminHelpers.unpublishRecipe(recipeId)
    res.redirect('/admin/view-your-recipes/')
})


router.get('/delete-admin-recipe/:id', verifyLogin, async (req, res) => {
    const recipeId = req.params.id;
    await recipeHelpers.deleteRecipe(recipeId)
    const imagePath = path.join(__dirname, '../public/recipe_images/', req.params.id + '.jpg');
    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error("Error while deleting image:", err);
            return res.status(500).send('Failed to delete the image');
        }
    })
    res.redirect('/admin/view-your-recipes')
})


router.get('/search-results', verifyLogin, async (req, res) => {
    const keyword = req.query.keyword
    const searchResults = await recipeHelpers.searchRecipesByName(keyword)
    res.render('admin/view-search-results', { title: 'search results', admin: true, searchResults, keyword })
})



/** Users */

router.get('/view-users', verifyLogin, async (req, res) => {
    const users = await userHelpers.getUsers()
    res.render('admin/view-users', { admin: true, users })
})


router.get('/view-members', verifyLogin, async (req, res) => {
    const users = await userHelpers.getMembers()
    res.render('admin/view-members', { admin: true, users })
})


router.get('/view-user-profile/:id', verifyLogin, async (req, res) => {
    const userData = await userHelpers.getUserData(req.params.id)
    const recipesCount = await recipeHelpers.getRecipeCount(req.params.id)
    res.render('admin/user-profile', { admin: true, userData, recipesCount })
})


router.get('/view-recipes-by-user/:id', verifyLogin, async (req, res) => {
    const recipes = await recipeHelpers.getRecipesByUserId(req.params.id)
    // Filter based on status
    const pendingRecipes = recipes.filter(recipe => recipe.status === 'pending');
    const rejectedRecipes = recipes.filter(recipe => recipe.status === 'rejected');
    const publishedRecipes = recipes.filter(recipe => recipe.status === 'published');

    res.render('admin/recipes-by-user', { admin: true, pendingRecipes, rejectedRecipes, publishedRecipes, recipes })
})


router.get('/delete-user/:id', verifyLogin, async (req, res) => {
    await userHelpers.deleteUser(req.params.id)
    res.redirect('/admin/view-users')
})


router.get('/edit-profile/:id', verifyLogin, async (req, res) => {
    const userData = await userHelpers.getUserData(req.params.id)
    res.render('admin/edit-user-profile', { admin: true, userData })
})


router.post('/edit-profile/:id', verifyLogin, async (req, res) => {
    try {
        await userHelpers.editUser(req.params.id, req.body)
        res.redirect('/admin/view-users')
    }
    catch {
        res.status(500).send('Error editing user');
    }
})


router.get('/search-user', verifyLogin, async (req, res) => {
    const keyword = req.query.keyword
    const users = await userHelpers.searchUser(keyword)
    res.render('admin/view-users', { title: 'View users', admin: true, users, keyword })
})



/** cuisines */

router.get('/view-all-cuisines', verifyLogin, async (req, res) => {
    const cuisines = await recipeHelpers.getCuisines()
    res.render('admin/view-all-cuisines', { admin: true, cuisines })
})


router.get('/add-cuisine', verifyLogin, (req, res) => {
    res.render('admin/add-cuisine', { admin: true })
})


router.post('/add-cuisine', verifyLogin, async (req, res) => {

    await adminHelpers.addCuisine(req.body, (id) => {
        const image = req.files.image
        image.mv('./public/images/' + id + '.jpg', (err, done) => {
            if (!err) {
                res.redirect('/admin/add-cuisine-success')
            }
        })
    })

    // res.redirect('/admin/add-cuisine-success')
})


router.get('/add-cuisine-success', verifyLogin, (req, res) => {
    res.render('admin/cuisine-submit-success', { admin: true })
})


router.get('/edit-cuisine/:id', verifyLogin, async (req, res) => {
    const cuisine = await recipeHelpers.getCuisine(req.params.id)
    res.render('admin/edit-cuisine', { admin: true, cuisine })
})


router.post('/edit-cuisine/:id', verifyLogin, async (req, res) => {
    const id = req.params.id
    await recipeHelpers.updateCuisine(id, req.body)
    if (req.files && req.files.image) {
        let image = req.files.image
        if (fs.existsSync('./public/images/' + id + '.jpg')) {
            fs.unlinkSync('./public/images/' + id + '.jpg');
        }
        image.mv('./public/images/' + id + '.jpg')
    }
    res.redirect('/admin/view-all-cuisines')
})


router.get('/delete-cuisine/:id', verifyLogin, async (req, res) => {
    const id = req.params.id
    await recipeHelpers.deleteCuisine(id)
    const imagePath = path.join(__dirname, '../public/images/', id + '.jpg');
    fs.unlink(imagePath, (err) => {
        if (err) {
            console.error("Error while deleting image:", err);
            return res.status(500).send('Failed to delete the image');
        }
    })
    res.redirect('/admin/view-all-cuisines')
})


router.get('/search-cuisine', verifyLogin, async (req, res) => {
    const keyword = req.query.keyword
    const cuisines = await recipeHelpers.searchCuisines(keyword)
    res.render('admin/view-all-cuisines', { title: 'cuisines', admin: true, cuisines, keyword })
})


router.get('/view-payments', verifyLogin, async (req, res) => {
    const payments = await adminHelpers.getAllPayments()
    // console.log(payments)
    res.render('admin/view-payments', { title: 'payments', admin: true, payments })
})


router.get('/view-pay-details/:id', verifyLogin, async (req, res) => {
    const payDetails = await adminHelpers.getPayDetails(req.params.id)
    res.render('admin/view-pay-details', { title: 'Payment details', admin: true, payDetails })
})

router.get('/delete-payment-record/:id', verifyLogin, async (req, res) => {
    await adminHelpers.deletePayRecord(req.params.id)
    res.redirect('/admin/view-payments')
})

router.get('/edit-pay-details/:id', verifyLogin, async (req, res) => {
    const payDetails = await adminHelpers.getPayDetails(req.params.id)
    res.render('admin/edit-pay-details', { title: 'Edit Payment details', admin: true, payDetails })
})


router.post('/edit-pay-details/:id', verifyLogin, async (req, res) => {
    const id = req.params.id
    await adminHelpers.editPayDetails(id, req.body)
    res.redirect('/admin/view-pay-details/' + id)
})


module.exports = router;