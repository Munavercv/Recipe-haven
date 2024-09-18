const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                userData.password = await bcrypt.hash(userData.password, 10);
                const result = await db.get().collection(collection.USERS_COLLECTION).insertOne(userData);
                resolve(result.insertedId);
            } catch (error) {
                reject(error);
                // userData.password = await bcrypt.hash(userData.password, 10)
                // db.get().collection(collection.USERS_COLLECTION).insertOne(userData).then((data) => {
                //     resolve(data.insertedId);
                // })
            }
        })
    }
}