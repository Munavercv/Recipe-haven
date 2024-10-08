const db = require('../config/connection')
const collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { response, resource } = require('../app');
const ObjectId = require('mongoose').Types.ObjectId;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { resolve } = require('path');

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
            resolve()
        })
    },
    

    sendOtp: async (email) => {
        return new Promise(async (resolve, reject) => {
            try {
                const otp = crypto.randomInt(100000, 999999);
                const expirationTime = Date.now() + 60 * 2000;
                // const expirationTime = Date.now() + 30 * 60 * 1000;// 30m for test

                // Store the OTP in the database
                await db.get().collection(collection.OTP_COLLECTION).insertOne({
                    email: email,
                    otp: otp,
                    expirationTime: expirationTime
                });

                // Set up the email options
                const mailOptions = {
                    from: `"Recipe Haven" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: 'Your OTP Code',
                    html: `Your OTP code to verify your Recipe Haven account is <br> <h1>${otp}</h1><br>It expires in 2 minute.`
                };

                // Create the transporter for sending the email
                const transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    }
                });

                // Send the email
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        return reject('Error sending OTP'); // Reject the promise
                    } else {
                        console.log('Email sent: ' + info.response);
                        return resolve(); // Resolve with the email
                    }
                });

            } catch (error) {
                console.error('Error in sendOtp:', error);
                reject('Failed to send OTP'); // Reject the promise in case of errors
            }
        });
    },

    verifyOTP: (otpRecord) => {
        return new Promise(async (resolve, reject) => {
            if (Date.now() > otpRecord.expirationTime) {
                // await db.get().collection(collection.OTP_COLLECTION).deleteOne({ email, otp }); //delete otp
                return resolve({ status: false, message: 'OTP expired, please request a new one' })
            }
            await db.get().collection(collection.USERS_COLLECTION).updateOne({ email: otpRecord.email }, { $set: { isVerified: true } })
            await db.get().collection(collection.OTP_COLLECTION).deleteMany({ email: otpRecord.email });
            resolve({status:true})
        })
    },

    doLogin: (email, password) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USERS_COLLECTION).findOne({ email: email })
                .then(user => {
                    if (!user) {
                        return resolve({ status: false, message: 'Invalid username or password' })
                    }

                    if (!user.isVerified) {
                        return resolve({ status: false, message: 'Invalid username or password' })
                    }

                    if (user.password === '') {
                        return resolve({ status: false, message: 'Please log in using Google.' });
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