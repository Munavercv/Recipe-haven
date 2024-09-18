const mongoose = require('mongoose');
const state = {
    db: null
}

module.exports.connect = (done) => {
    const url = "mongodb://localhost:27017/recipe_haven_DB"; // Include the database name in the URL

    mongoose.connect(url)
        .then(() => {
            console.log("Connected to MongoDB");
            state.db = mongoose.connection;  // Mongoose manages the connection internally
            done();  // Call done() after connection is established
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err);
            done(err);  // Call done with the error if the connection fails
        });
}

module.exports.get = () => {
    return state.db;  // Return the Mongoose connection object if needed elsewhere
}
