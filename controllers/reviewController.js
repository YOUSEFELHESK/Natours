const Review = require('../models/ReviewModel');
const AppError = require('../ulits/appError');
const catchAsync = require('../ulits/catchAsync');
const Factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = Factory.getAll(Review);
exports.createReview = Factory.createOne(Review);
exports.deleteReview = Factory.deleteOne(Review);
exports.updateReview = Factory.UpdateOne(Review);
exports.getReview = Factory.getOne(Review);
