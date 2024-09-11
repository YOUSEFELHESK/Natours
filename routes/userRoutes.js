/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
const express = require('express');
const userController = require('../controllers/usercontroller');
const authController = require('../controllers/authController');

const router = express.Router();

// auth
router.post('/signup', authController.SignUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// will protect all the routes after it, beacuse the middleware run in sequence
router.use(authController.protect);

router.patch(
  '/updateMypassword',

  authController.updatePassword
);
router.get(
  '/Me',

  userController.GetMe,
  userController.getUser
);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

// will run for all the routes after it, beacuse the middleware run in sequence
router.use(authController.restrictTo('admin'));

// Users
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
