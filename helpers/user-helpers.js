const db = require('../config/connection')
const collections = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {

    getUsers: async () => {
        const users = await db.get().collection(collections.USERS_COLLECTION).find({ role: 'user' },
            {
                projection: {
                    password: 0,
                    role: 0,
                    isVerified: 0,
                }
            }
        ).toArray()
        return users;
    },

    getUserData: async (userId) => {
        const userData = await db.get().collection(collections.USERS_COLLECTION).findOne({ _id: new ObjectId(userId) },
            {
                projection: {
                    password: 0,
                    role: 0,
                    isVerified: 0,
                }
            }
        )
        return userData;
    },

    deleteUser: async (userId) => {
        await db.get().collection(collections.USERS_COLLECTION).deleteOne({ _id: new ObjectId(userId) })
    },

    editUser: async (userId, data) => {
        await db.get().collection(collections.USERS_COLLECTION).updateOne({ _id: new ObjectId(userId) },
            {
                $set: {
                    name: data.name,
                    email: data.email,
                    mobile: data.mobile
                }
            }
        )
    },

    updateRecipe:(recipeId, recipe) => {
        return new Promise(async (resolve, reject) => {

            const cuisine = await db.get().collection(collections.CUISINE_COLLECTION).findOne({ _id: new ObjectId(recipe.cuisine) }, { projection: { description: 0 } })
            db.get().collection(collections.RECIPES_COLLECTION)
                .updateOne({ _id: new ObjectId(recipeId) }, {
                    $set: {
                        name: recipe.name,
                        cooking_instructions: recipe.cooking_instructions,
                        ingredients: recipe.ingredients,
                        cuisine: cuisine,
                        status:'pending'
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },

}