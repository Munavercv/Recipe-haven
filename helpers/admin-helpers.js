const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
    getUserRecipes: async () => {
        // console.log(userData._id)
        const userRecipes = await db.get().collection(collection.RECIPES_COLLECTION).find().toArray()
        // console.log(userRecipes)
        return userRecipes
    },

    publishRecipe: async (recipeId) => {
        const datePublished = new Date()
        await db.get().collection(collection.RECIPES_COLLECTION).updateOne({ _id: new ObjectId(recipeId) },
            {
                $set: {
                    status: 'published',
                    datePublished: datePublished
                }
            })
    },

    unpublishRecipe: async (recipeId) => {
        await db.get().collection(collection.RECIPES_COLLECTION).updateOne(
            { _id: new ObjectId(recipeId) },
            {
                $set: {
                    status: 'pending'
                },
                $unset: {
                    datePublished: ""
                }
            }
        );

    },

    rejectRecipe: async (recipeId) => {
        await db.get().collection(collection.RECIPES_COLLECTION).updateOne({ _id: new ObjectId(recipeId) },
            {
                $set: {
                    status: 'rejected'
                }
            })
    },

    deleteRecipe: async (recipeId) => {
        await db.get().collection(collection.RECIPES_COLLECTION).deleteOne({ _id: new ObjectId(recipeId) });
        console.log('recipe delete')
    },

    updateRecipe: (recipeId, recipe) => {
        return new Promise(async (resolve, reject) => {

            const cuisine = await db.get().collection(collection.CUISINE_COLLECTION).findOne({ _id: new ObjectId(recipe.cuisine) }, { projection: { description: 0 } })
            db.get().collection(collection.RECIPES_COLLECTION)
                .updateOne({ _id: new ObjectId(recipeId) }, {
                    $set: {
                        name: recipe.name,
                        cooking_instructions: recipe.cooking_instructions,
                        ingredients: recipe.ingredients,
                        cuisine: cuisine,
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },

    getUsers: async () => {
        const users = await db.get().collection(collection.USERS_COLLECTION).find({ role: 'user' },
            {
                projection: {
                    password: 0,
                    role: 0,
                    isVerified: 0,
                }
            }
        ).toArray()
        return users;
    }


}