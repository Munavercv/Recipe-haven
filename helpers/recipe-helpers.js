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

    getCuisine: (cuisineId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const cuisine = await db.get().collection(collection.CUISINE_COLLECTION).findOne({ _id: new ObjectId(cuisineId) })
                resolve(cuisine);
            } catch (error) {
                console.error('Error fetching cuisines:', error);
                reject(error);
            }
        })
    },

    updateCuisine: async (cuisineId, cuisineData) => {
        await db.get().collection(collection.CUISINE_COLLECTION).updateOne({ _id: new ObjectId(cuisineId) },
            {
                $set: {
                    name: cuisineData.name,
                    description: cuisineData.description
                }
            }
        )
    },

    deleteCuisine: async (cuisineId) => {
        await db.get().collection(collection.CUISINE_COLLECTION).deleteOne({ _id: new ObjectId(cuisineId) })
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

    getRecipesByUser: (userData) => {
        return new Promise(async (resolve, reject) => {
            // console.log(userData._id)
            const userRecipes = await db.get().collection(collection.RECIPES_COLLECTION).find({ userId: new ObjectId(userData._id) }).toArray()
            // console.log(userRecipes)
            resolve(userRecipes)
        })
    },

    getRecipe: (recipeId) => {
        return new Promise(async (resolve, reject) => {
            const recipe = await db.get().collection(collection.RECIPES_COLLECTION).aggregate([
                {
                    $match: {
                        _id: new ObjectId(recipeId)
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userDetails"
                    }
                },
                {
                    $unwind: "$userDetails"
                },
                {
                    $project: {
                        name: 1,
                        cooking_instructions: 1,
                        ingredients: 1,
                        cuisine: 1,
                        status: 1,
                        userId: 1,
                        "userDetails.name": 1,
                        "userDetails.email": 1,
                    }
                }
            ]).toArray()
            resolve(recipe)
        })
    },

    getRecipesByUserId: async (userId) => {
        const recipes = await db.get().collection(collection.RECIPES_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
        return recipes
    },

    getRecipeCount: async (userId) => {
        const recipesCount = await db.get().collection(collection.RECIPES_COLLECTION).find({ userId: new ObjectId(userId) }).count()
        return recipesCount
    },

    deleteRecipe: async (recipeId) => {
        await db.get().collection(collection.RECIPES_COLLECTION).deleteOne({ _id: new ObjectId(recipeId) });
    },

    getLatestRecipes: async (limit) => {
        // const recipes = await db.get().collection(collection.RECIPES_COLLECTION).find({ status: 'published' }, { $sort: { datePublished } })
        const recipes = await db.get()
            .collection(collection.RECIPES_COLLECTION)
            .aggregate([
                { $match: { status: 'published' } },
                { $sort: { datePublished: 1 } },
                {
                    $limit: limit
                },
                {
                    $project: {
                        cooking_instructions: 0,
                        ingredients: 0,
                        cuisine: 0,
                        userId: 0,
                        dateCreated: 0,
                        status: 0,
                        datePublished: 0
                    }
                }
            ])
            .toArray();
        return recipes
        // console.log(recipes)
    }


}