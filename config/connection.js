const mongoose = require('mongoose');
const state = {
    db: null
}

module.exports.connect = (done) => {
    const url = "mongodb://localhost:27017/recipe_haven_DB";

    mongoose.connect(url)
        .then(() => {
            console.log("Connected to MongoDB");
            state.db = mongoose.connection;
            done();
        })
        .catch((err) => {
            console.error("MongoDB connection error:", err);
            done(err);
        });
}

module.exports.get = () => {
    return state.db;
}
