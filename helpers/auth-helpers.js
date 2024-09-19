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

                    bcrypt.compare(password, user.password)
                        .then(isPasswordValid => {
                            if (!isPasswordValid) {
                                return resolve({ status: false, message: 'Invalid username or password' });
                            }

                            // Step 4: Check user role
                            if (user.role === 'admin') {
                                resolve({ status: true, userRole: 'admin', redirectUrl: '/admin/admin-home', user });
                              } else if (user.role === 'user') {
                                resolve({ status: true, userRole: 'user', redirectUrl: '/user/user-home', user });
                              } else {
                                resolve({ status: false, message: 'Invalid user role' });
                            }

                        })
                        .catch(err => reject(err)); // Error in password comparison
                })
                .catch(err => reject(err)); // Error in finding user by email
        })
    }

}