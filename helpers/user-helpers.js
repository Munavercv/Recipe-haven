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


    updateRecipe: (recipeId, recipe) => {
        return new Promise(async (resolve, reject) => {
            const date = new Date
            const cuisine = await db.get().collection(collections.CUISINE_COLLECTION).findOne({ _id: new ObjectId(recipe.cuisine) }, { projection: { description: 0 } })
            db.get().collection(collections.RECIPES_COLLECTION)
                .updateOne({ _id: new ObjectId(recipeId) }, {
                    $set: {
                        name: recipe.name,
                        cooking_instructions: recipe.cooking_instructions,
                        ingredients: recipe.ingredients,
                        cuisine: cuisine,
                        status: 'pending',
                        dateCreated: date
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },


    getUserCount: async () => {
        const count = db.get().collection(collections.USERS_COLLECTION).countDocuments({ role: 'user' })
        return count
    },


    getMembersCount: async () => {
        const count = db.get().collection(collections.USERS_COLLECTION).countDocuments({ role: 'member' })
        return count
    },


    searchUser: async (searchQuery) => {
        let query;

        // If the user has entered one letter, search for names starting with that letter
        if (searchQuery.length === 1) {
            query = {
                role: 'user',
                email: { $regex: `^${searchQuery}`, $options: "i" }  // 'i' makes it case-insensitive
            };
        } else {
            // If the user has entered more than one letter/word, search for names containing the search words
            const words = searchQuery.split(" ");
            const regexArray = words.map(word => ({
                email: { $regex: word, $options: "i" }  // Case-insensitive search for each word
            }));

            query = {
                role: 'user',
                $and: regexArray
            };
        }

        
        const usersData = await db.get()
            .collection(collections.USERS_COLLECTION)
            .find(query)
            .project({
                password: 0,
                role: 0,
                isVerified: 0,
            })
            .toArray();

        return usersData;
    },


}