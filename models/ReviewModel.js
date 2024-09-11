const mongoose = require('mongoose');

// eslint-disable-next-line import/no-extraneous-dependencies
const slugify = require('slugify');

// eslint-disable-next-line import/no-extraneous-dependencies
const validator = require('validator');
const Tour = require('./tourModel');

const ReviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A Rewiew can not be empty'],
      maxlength: [500, 'Maxlength is 500 characters!!'],
      minlength: [20, 'Minlength is 50 characters!!'],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    createAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ReviewSchema.index({ tour: 1, user: 1 }, { unique: true });

ReviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

ReviewSchema.statics.calcAverageRating = async function (tourId) {
  // this points to the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRatings,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      // default
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

ReviewSchema.post('save', function () {
  // this point to current review
  // this.constructor === Review , but you cannot use Review now , it is not declared yet
  this.constructor.calcAverageRating(this.tour);
});

// in .post you do not have access to query

// Section 11 , e: 169

// findOneAndUpdate -> is just a shorhand for findOneAndUpdate with the current Id
// findOneAndDelete

/*
! I find out that we don't need this middtemre as the post
! middleware gets doc os on argument
*/
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   // this is the current query
//   this.r = await this.findOne();
//   console.log(this);
//   next();
// });

ReviewSchema.post(/^findOneAnd/, async (doc) => {
  // await this.findOne(); does not work here the quey has already executed
  // here is the same thing we need to call constructor on doc
  // await this.r.constructor.calcAverageRating(this.r.tour);
  // we need to check if there's a doc because what if we are deleting
  // with id that's not present

  if (doc) await doc.constructor.calcAverageRating(doc.tour);
});

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;
