const db = require('../config/connection')
const collections = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;
const Razorpay = require('razorpay')
const dotenv = require('dotenv')
require('dotenv').config()

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


module.exports = {

    getUsers: async () => {
        const users = await db.get().collection(collections.USERS_COLLECTION).find({ role: { $in: ['user', 'pro'] } },
            {
                projection: {
                    password: 0,
                    isVerified: 0,
                }
            }
        ).toArray()

        let modifiedUsers = users.map(user => ({
            ...user,
            isPro: user.role === 'pro'
        }));

        return modifiedUsers;
    },


    getMembers: async () => {
        const users = await db.get().collection(collections.USERS_COLLECTION).find({ role: 'pro' },
            {
                projection: {
                    password: 0,
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
                    isVerified: 0
                }
            }
        )
        if (userData.role === 'pro')
            userData.isPro = true

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
        const count = db.get().collection(collections.USERS_COLLECTION).countDocuments({ role: { $in: ['user', 'pro'] } })
        return count
    },


    getMembersCount: async () => {
        const count = db.get().collection(collections.USERS_COLLECTION).countDocuments({ role: 'pro' })
        return count
    },



    searchUser: async (searchQuery) => {
        let query;

        // If the user has entered one letter, search for names starting with that letter
        if (searchQuery.length === 1) {
            query = {
                role: { $in: ['user', 'pro'] },
                email: { $regex: `^${searchQuery}`, $options: "i" }  // 'i' makes it case-insensitive
            };
        } else {
            // If the user has entered more than one letter/word, search for names containing the search words
            const words = searchQuery.split(" ");
            const regexArray = words.map(word => ({
                email: { $regex: word, $options: "i" }  // Case-insensitive search for each word
            }));

            query = {
                role: { $in: ['user', 'pro'] },
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


    generateRazorpay: async (userId, amount) => {
        try {
            const options = {
                amount: amount,  // Amount in smallest currency unit (e.g., 50000 paise = ₹500)
                currency: "INR",
                receipt: userId.toString()
            };
            const order = await razorpay.orders.create(options);
            order.amount = amount/100
            // res.json(order);
            return order
        } catch (error) {
            res.status(500).send(error);
        }
    },


    updateUserToPro: async (userId, orderId, amount) => {
        try {
            const currentDate = new Date();
    
            // Find user to check membership expiration status
            const user = await db.get().collection(collections.USERS_COLLECTION).findOne(
                { _id: new ObjectId(userId) },
                { projection: { membershipExpiresAt: 1 } }
            );
    
            let expirationDate = new Date();
            if (user && user.membershipExpiresAt) {
                const membershipExpiresAt = new Date(user.membershipExpiresAt);
    
                // If the membership is not expired, add the remaining days to the new date
                if (membershipExpiresAt > currentDate) {
                    const remainingDays = Math.ceil((membershipExpiresAt - currentDate) / (1000 * 60 * 60 * 24));
                    expirationDate.setDate(expirationDate.getDate() + remainingDays);
                }
            }
    
            // Set expiration based on the amount
            if (amount === 100) {
                expirationDate.setMonth(expirationDate.getMonth() + 1); // Add 1 month
            } else if (amount === 600) {
                expirationDate.setMonth(expirationDate.getMonth() + 6); // Add 6 months
            } else if (amount === 1140) {
                expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Add 1 year
            }
    
            // Update the user to pro with the new expiration date
            const result = await db.get().collection(collections.USERS_COLLECTION).updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        role: "pro",
                        membershipExpiresAt: expirationDate
                    }
                }
            );
    
            // Check if any document was modified
            if (result.modifiedCount === 0) {
                throw new Error('User not found or already upgraded');
            }
    
            // Update payment status
            await db.get().collection(collections.PAYMENTS_COLLECTION).updateOne(
                { _id: new ObjectId(orderId) },
                { $set: { success: true } }
            );
    
            return { success: true, membershipExpiresAt: expirationDate }; // Return success status
        } catch (error) {
            throw new Error('Failed to upgrade user'); // Throw error to handle it in the route
        }
    },
    

    storePaymentDetails: async (userId, orderId, amount) => {
        const date = new Date()
        const success = false
        const result = await db.get().collection(collections.PAYMENTS_COLLECTION).insertOne({
            userId: new ObjectId(userId),
            orderId: orderId,
            amount: amount,
            currency: 'INR',
            createdAt: date,
            success: success
        })
        const insertedId = result.insertedId
        return insertedId;
    },


    checkMembershipExpiry: (user) => {
        const currentDate = new Date();
        const expiryDate = new Date(user.membershipExpiresAt);
        const daysLeft = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));

        if (expiryDate < currentDate) {
            return { notifyExpiry: true, expired: true, daysLeft: 0 };
        } else if (daysLeft <= 2) {
            return { notifyExpiry: true, expired: false, daysLeft };
        } else {
            return { notifyExpiry: false, expired: false, daysLeft };
        }
    }

}