const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const exphbs = require('express-handlebars')
const fileUpload = require('express-fileupload')
const db = require('./config/connection')
const session = require('express-session')
const userRouter = require('./routes/user')
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const dotenv = require('dotenv')
require('dotenv').config()
const fs = require('fs');
// const helpers = require('handlebars-helpers')();

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', exphbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' }))
// app.engine('hbs', exphbs.engine({ extname: 'hbs',helpers: helpers, defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' }))

// bootstrap
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
// bootstrap

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload())

app.use(session({
  // secret: 'Key',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 5,
    secure: false
  }
}));

// exphbs.create({
//   helpers: {
//     eq: function (a, b) {
//       return a === b;
//     }
//   }
// });

// Call the connect function to initiate a MongoDB connection
db.connect((err) => {
  if (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  } else {
    console.log('MongoDB connection successful');
  }
});

app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/', authRouter);


// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
//   // res.redirect('/404-error')
//   res.render('/404-page', { hideHeader: true, })
// });

app.use(function (req, res) {
  res.status(404);
  res.render('404-page', { hideHeader: true });
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { hideHeader: true });
});

module.exports = app;
