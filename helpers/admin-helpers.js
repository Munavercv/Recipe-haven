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


    addCuisine: async (cuisine, saveImage) => {
        const result = await db.get().collection(collection.CUISINE_COLLECTION).insertOne({
            name: cuisine.name,
            description: cuisine.description
        })

        const insertedId = result.insertedId
        saveImage(insertedId)
    },


    getAllPayments: async () => {
        const allPayments = await db.get().collection(collection.PAYMENTS_COLLECTION).aggregate([
            {
                $lookup: {
                    from: collection.USERS_COLLECTION,
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $project: {
                    userId: 1,
                    orderId: 1,
                    amount: 1,
                    createdAt: 1,
                    success: 1,
                    'userDetails.email': 1
                }
            }
        ]).sort({ createdAt: -1 }).toArray()

        // Format the createdAt date after retrieving the data
        const formattedPayments = allPayments.map(payment => {
            const date = new Date(payment.createdAt);
            const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };

            const formattedDate = date.toLocaleDateString('en-US', dateOptions); // Format: Fri, Oct 18, 2024
            // const formattedTime = date.toLocaleTimeString('en-US', timeOptions); // Format: 04:16:03 PM

            payment.createdAt = `${formattedDate}`; // Combine date and time

            return payment;
        });

        return formattedPayments;
    },


    getPayDetails: async (paymentId) => {
        try {
            const paymentDetails = await db.get().collection(collection.PAYMENTS_COLLECTION).aggregate([
                {
                    $match: { _id: new ObjectId(paymentId) }
                },
                {
                    $lookup: {
                        from: collection.USERS_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: '$userDetails'
                },
                {
                    $project: {
                        _id: 1,
                        orderId: 1,
                        amount: 1,
                        currency: 1,
                        createdAt: 1,
                        success: 1,
                        'userDetails.email': 1,
                        'userDetails.name': 1,
                        'userDetails.mobile': 1,
                    }
                }
            ]).toArray();

            const date = new Date(paymentDetails[0].createdAt);
            const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };

            const formattedDate = date.toLocaleDateString('en-US', dateOptions); // Format: Fri, Oct 18, 2024
            const formattedTime = date.toLocaleTimeString('en-US', timeOptions); // Format: 04:16:03 PM

            paymentDetails[0].createdAt = `${formattedDate}, ${formattedTime}`; // Combine date and time
            return paymentDetails[0]; // Return the first matching payment details

        } catch (error) {
            console.error('Error fetching payment details:', error);
            return null;
        }
    },


    deletePayRecord: async (id) => {
        try {
            await db.get().collection(collection.PAYMENTS_COLLECTION).deleteOne({ _id: new ObjectId(id) })
        } catch (error) {
            console.log('Error deleting payment record:', error)
        }
    },


    editPayDetails: async (id, data) => {
        await db.get().collection(collection.PAYMENTS_COLLECTION).updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    amount: data.amount,
                    currency: data.currency,
                    success: data.success
                }
            }
        );
    }
    
}