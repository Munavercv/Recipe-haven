const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;

const getUserBookmarks = async (userId) => {
    const user = await db.get().collection(collection.USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
    return user ? user.bookmarkedRecipes : [];
}

module.exports = {
    getCuisines: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const cuisines = await db.get().collection(collection.CUISINE_COLLECTION).find({}).sort({ name: 1 }).toArray();
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
                        ratings: {
                            $ifNull: ["$ratings", []] // Ensure ratings is an array
                        },
                        averageRating: {
                            $cond: {
                                if: { $gt: [{ $size: { $ifNull: ["$ratings", []] } }, 0] },
                                then: { $divide: [{ $sum: "$ratings.rating" }, { $size: { $ifNull: ["$ratings", []] } }] },
                                else: 0
                            }
                        }
                    }
                }
            ]).toArray();
    
            if (recipe.length > 0) {
                resolve(recipe); // Resolve with the first recipe object
            } else {
                reject(new Error("Recipe not found"));
            }
        });
    },    


    getRecipesByUserId: async (userId) => {
        const recipes = await db.get().collection(collection.RECIPES_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
        return recipes
    },


    getRecipeCount: async (userId) => {
        const recipesCount = await db.get().collection(collection.RECIPES_COLLECTION).countDocuments({ userId: new ObjectId(userId) })
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
                { $sort: { datePublished: -1 } },
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
    },


    getAllRecipes: async () => {
        const recipes = await db.get()
            .collection(collection.RECIPES_COLLECTION)
            .aggregate([
                { $match: { status: 'published' } },
                { $addFields: { randomValue: { $rand: {} } } },
                { $sort: { randomValue: -1 } },
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
    },


    getRecipesByCuisine: async (cuisineId) => {
        const recipes = await db.get()
            .collection(collection.RECIPES_COLLECTION)
            .aggregate([
                { $match: { "cuisine._id": new ObjectId(cuisineId) } },
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
    },


    searchRecipesByName: async (searchQuery) => {
        let query;

        // If the user has entered one letter, search for names starting with that letter
        if (searchQuery.length === 1) {
            query = {
                status: "published",
                name: { $regex: `^${searchQuery}`, $options: "i" }  // 'i' makes it case-insensitive
            };
        } else {
            // If the user has entered more than one letter/word, search for names containing the search words
            const words = searchQuery.split(" ");
            const regexArray = words.map(word => ({
                name: { $regex: word, $options: "i" }  // Case-insensitive search for each word
            }));

            query = {
                status: "published",
                $and: regexArray
            };
        }

        // Fetch the recipes matching the query
        const recipes = await db.get()
            .collection(collection.RECIPES_COLLECTION)
            .find(query)
            .project({
                cooking_instructions: 0,
                ingredients: 0,
                cuisine: 0,
                userId: 0,
                dateCreated: 0,
                status: 0,
                datePublished: 0
            })
            .toArray();

        return recipes;
    },


    searchCuisines: async (searchQuery) => {
        let query;

        // If the user has entered one letter, search for names starting with that letter
        if (searchQuery.length === 1) {
            query = {
                name: { $regex: `^${searchQuery}`, $options: "i" }  // 'i' makes it case-insensitive
            };
        } else {
            // If the user has entered more than one letter/word, search for names containing the search words
            const words = searchQuery.split(" ");
            const regexArray = words.map(word => ({
                name: { $regex: word, $options: "i" }  // Case-insensitive search for each word
            }));

            query = {
                $and: regexArray
            };
        }

        // Fetch the recipes matching the query
        const cuisines = await db.get()
            .collection(collection.CUISINE_COLLECTION)
            .find(query)
            .toArray();

        return cuisines;
    },


    getPublishedRecipesCount: async () => {
        const count = await db.get().collection(collection.RECIPES_COLLECTION).countDocuments({ status: 'published' });
        return count
    },


    getPendingRecipesCount: async () => {
        const count = db.get().collection(collection.RECIPES_COLLECTION).countDocuments({ status: 'pending' })
        return count
    },


    getCuisineCount: async () => {
        const count = db.get().collection(collection.CUISINE_COLLECTION).countDocuments()
        return count
    },


    bookmarkRecipe: async (userId, recipeId) => {
        // console.log(userId, recipeId)
        await db.get().collection(collection.USERS_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { bookmarkedRecipes: new ObjectId(recipeId) } }
        );
    },


    unbookmarkRecipe: async (userId, recipeId) => {
        await db.get().collection(collection.USERS_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { bookmarkedRecipes: new ObjectId(recipeId) } }
        );
    },


    isRecipeBookmarked: async (userId, recipeId) => {
        const bookmarks = await getUserBookmarks(userId);

        // Check if bookmarks is defined and not empty
        if (!bookmarks || bookmarks.length === 0) {
            return false; // User has no bookmarks, so the recipe is not bookmarked
        }

        // Check if the recipe is bookmarked
        const isBookmarked = bookmarks.some(bookmark => bookmark.toString() === recipeId.toString());

        return isBookmarked;
    },



    getBookmarks: async (userId) => {
        // Fetch the user with bookmarkedRecipes field
        const user = await db.get().collection(collection.USERS_COLLECTION).findOne(
            { _id: new ObjectId(userId) },
            { projection: { _id: 1, bookmarkedRecipes: 1 } }
        );

        // Check if user has bookmarked recipes
        if (!user || !user.bookmarkedRecipes || user.bookmarkedRecipes.length === 0) {
            return []; // Return empty array if no bookmarks
        }

        // Fetch all bookmarked recipes in one go using $in
        const recipes = await db.get().collection(collection.RECIPES_COLLECTION).find({
            _id: { $in: user.bookmarkedRecipes.map(id => new ObjectId(id)) }
        }, {
            projection: {
                cooking_instructions: 0,
                ingredients: 0,
                cuisine: 0,
                userId: 0,
                dateCreated: 0,
                status: 0,
                datePublished: 0
            }
        }).toArray();

        return recipes;
    },


    doRating: async (recipeId, userId, rating) => {
        const recipe = await db.get().collection(collection.RECIPES_COLLECTION).findOne({ _id: new ObjectId(recipeId)});
    
        // Initialize ratings field if it does not exist
        if (!recipe.ratings) {
            recipe.ratings = []; // Create an empty array for ratings
        }
    
        // Initialize ratings field if it does not exist
        if (!recipe.ratings) {
            recipe.ratings = []; // Create an empty array for ratings
        }
    
        // Check if user has already rated
        const userHasRated = recipe.ratings.find(r => r.userId.toString() === userId.toString());
    
        if (userHasRated) {
            return { success: false, message: 'You have already rated this recipe' };
        }
    
        // Add new rating to the recipe
        await db.get().collection(collection.RECIPES_COLLECTION).updateOne(
            { _id: new ObjectId(recipeId) },
            { $push: { ratings: { userId: new ObjectId(userId), rating: parseInt(rating) } } }
        );
    
        return { success: true };
    },


    // calculateAverageRating: async (recipeId) => {
    //     const recipe = await db.get().collection(collection.RECIPES_COLLECTION).findOne({ _id: new ObjectId(recipeId) });

    //     if (!recipe || !recipe.ratings || recipe.ratings.length === 0) {
    //         return 0;
    //     }

    //     const totalRating = recipe.ratings.reduce((sum, r) => sum + r.rating, 0);
    //     const averageRating = (totalRating / recipe.ratings.length).toFixed(2);

    //     return averageRating;
    // }

}