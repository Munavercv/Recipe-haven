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
        const result = await db.get().collection(collection.RECIPES_COLLECTION).updateOne({ _id: new ObjectId(recipeId) },
            {
                $set: {
                    status: 'published'
                }
            })
    },

    unpublishRecipe: async (recipeId) => {
        const result = await db.get().collection(collection.RECIPES_COLLECTION).updateOne({ _id: new ObjectId(recipeId) },
            {
                $set: {
                    status: 'pending'
                }
            })
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

}