var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const exphbs =require('express-handlebars')
const fileUpload = require('express-fileupload')
const db = require('./config/connection')
const session = require('express-session')
var userRouter = require('./routes/user')
var adminRouter = require('./routes/admin');
var authRouter = require('./routes/auth');
const dotenv=require('dotenv')
require('dotenv').config()

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs', exphbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' }))

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
      maxAge: 1000 * 60 * 30,
      secure: false          
  }
}));

exphbs.create({
  helpers: {
    eq: function (a, b) {
      return a === b;
    }
  }
});

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
app.use(function (req, res, next) {
  next(createError(404));
  res.redirect('/404-error')
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
