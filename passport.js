const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

passport.serializeUser((user, done) => {
	done(null, user);
})
passport.deserializeUser(function (user, done) {
	done(null, user);
});

passport.use(new GoogleStrategy({
	clientID: '64439887219-rj01lhpocg7vn7k6gu0fjrk4oabgmkra.apps.googleusercontent.com',
	clientSecret: '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',
	callbackURL: "http://localhost:3000/auth/google/callback",
	passReqToCallback: true
},
	function (request, accessToken, refreshToken, profile, done) {
		return done(null, profile);
	}
));