const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
    getCuisines: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const cuisines = await db.get().collection(collection.CUISINE_COLLECTION).find({}).toArray();
                resolve(cuisines);
            } catch (error) {
                console.error('Error fetching cuisines:', error);
                reject(error);
            }
        })
    },

    saveRecipe: (recipe, user, callback) => {
        return new Promise(async (resolve, reject) => {
            // console.log(recipe.cuisine)
            const name = recipe.name
            const cooking_instructions = recipe.cooking_instructions
            const ingredients = recipe.ingredients
            const cuisine = await db.get().collection(collection.CUISINE_COLLECTION).findOne({ _id: new ObjectId(recipe.cuisine) }, { projection: { description: 0 } })
            let status;

            if (user.role == 'admin')
                status = 'published'
            else
                status = 'pending'
            
            // console.log(user._id)
            const userId = new ObjectId(user._id);
            const date = new Date()

            await db.get().collection(collection.RECIPES_COLLECTION).insertOne({
                name: name,
                cooking_instructions: cooking_instructions,
                ingredients: ingredients,
                cuisine: cuisine,
                status: status,
                userId: userId,
                dateCreated: date
            }).then((data) => {
                // console.log(data)
                callback(data.insertedId)
            })

        })
    },

    getRecipesByUser:(userData)=>{
        return new Promise (async (resolve,reject)=>{
            // console.log(userData._id)
            const userRecipes = await db.get().collection(collection.RECIPES_COLLECTION).find({userId:new ObjectId(userData._id)}).toArray()
            // console.log(userRecipes)
            resolve(userRecipes)
        })
    }

}