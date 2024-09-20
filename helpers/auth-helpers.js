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
            }
        })
    },
    doGoogleSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            const data = await db.get().collection(collection.USERS_COLLECTION).insertOne(userData);
            // console.log('userData')
            resolve()
            // try {
            //     const data = await db.get().collection(collection.USERS_COLLECTION).insertOne(userData);
            //     resolve(data.insertedId); // Resolving the inserted user's ID
            // } catch (error) {
            //     console.error('Error during Google signup:', error); // Log the error
            //     reject(error); // Rejecting the promise in case of failure
            // }
        })
    },

    doLogin: (email, password) => {
        return new Promise(async (resolve, reject) => {
            // console.log(email)
            db.get().collection(collection.USERS_COLLECTION).findOne({ email: email })
                .then(user => {
                    if (!user) {
                        return resolve({ status: false, message: 'Invalid username or password' })
                    }

                    if (!user.isVerified) {
                        return resolve({ status: false, message: 'Invalid username or password' })
                    }

                    if (user.password === '') {
                        return resolve({status:false, message:'Please log in using Google.'});
                    }

                    bcrypt.compare(password, user.password)
                        .then(isPasswordValid => {
                            if (!isPasswordValid) {
                                return resolve({ status: false, message: 'Invalid username or password' });
                            }

                            // Step 4: Check user role
                            if (user.role === 'admin') {
                                resolve({ status: true, userRole: 'admin', redirectUrl: '/admin/admin-home', user });
                            } else if (user.role === 'user') {
                                resolve({ status: true, userRole: 'user', redirectUrl: '/', user });
                            } else {
                                resolve({ status: false, message: 'Permission denied' });
                            }

                        })
                        .catch(err => reject(err)); // Error in password comparison
                })
                .catch(err => reject(err)); // Error in finding user by email
        })
    },
    
    findUserByEmail: (email) => {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await db.get().collection(collection.USERS_COLLECTION).findOne({ email: email });
                resolve(user); // Returns the user if found, otherwise null
            } catch (error) {
                console.error('Error finding user by email:', error);
                throw error; // Rethrow the error to handle it outside
            }
        })
}

}