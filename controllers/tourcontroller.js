/* eslint-disable import/no-extraneous-dependencies */
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
// eslint-disable-next-line import/extensions, node/no-missing-require, import/no-unresolved
const catchAsync = require('../ulits/catchAsync');
// eslint-disable-next-line import/no-unresolved, import/extensions, node/no-missing-require
const AppError = require('../ulits/appError');
const Factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// As a reference
// upload.fields([
//   { name: 'imageCover', maxCount: 1 },
//   { name: 'images', maxCount: 3 },
// ]);
// upload.single('image'); req.file
// upload.array('images', 5); req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  // 2)Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, index) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );
  next();
});

exports.aliasTopTour = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};
exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1; // 2021

    console.log(year);

    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: { month: '$_id' },
      },
      {
        $project: {
          _id: 0, // _id no longer show up if 1 it would show up
        },
      },
      {
        $sort: { numTourStarts: -1 },
      },
      {
        $limit: 12, // limit the number of digit month
      },
    ]);
    console.log(plan);
    res.status(200).json({
      status: 'success',
      data: plan,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      massage: 'Invalid data sent..!',
    });
  }
};
exports.getTOurStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          //_id: null,
          _id: { $toUpper: '$difficulty' },
          numTours: { $sum: 1 },
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      // {
      //   $project: {
      //     _id: 1,
      //   },
      // },
      {
        /*
         1 Sort ascending.
        -1 Sort descending.
        */
        $sort: { avgPrice: -1 },
      },
      // {
      //   $limit: 6,
      // },
      // {
      //   $match: { _id: { $ne: 'EASY' } }, // ne -> not equal to
      // },
    ]);
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      massage: 'Invalid data sent..!',
    });
  }
};

// Read and Write from database

// ROUTE HANDLER

exports.getAllTours = Factory.getAll(Tour);
exports.createTour = Factory.createOne(Tour);
exports.deleteTour = Factory.deleteOne(Tour);
exports.updateTour = Factory.UpdateOne(Tour);

exports.getTour = Factory.getOne(Tour, { path: 'reviews' });

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // Calculate Radius in Miles (mi) or Kilometers (km) based on the provided distance and unit.
  // If 'unit' is equal to 'mi', use the formula distance / 3963.2 to calculate the radius in miles.
  // If 'unit' is not equal to 'mi', assume it's 'km', and use the formula distance / 6378.1 to calculate the radius in kilometers.
  // The result is stored in the constant variable 'radius', representing the calculated radius.
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide latituter and longitude in the format lat,lng.',
        400
      )
    );
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // 0.000621371 -> from m to mile  0.001 -> form m to km

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide latituter and longitude in the format lat,lng.',
        400
      )
    );

  const distances = await Tour.aggregate([
    {
      // geoNear need to be the first stage
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'Distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        Distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances,
    },
  });
});
