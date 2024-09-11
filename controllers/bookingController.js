/* eslint-disable import/extensions */
/* eslint-disable node/no-missing-require */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../ulits/catchAsync');
const AppError = require('../ulits/appError');
const Factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create the checkout session

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    // This is not secure , any one with this URL can book tour without paying
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,

    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment', // Set the mode to 'payment' or 'subscription'
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100, // The price in cents, e.g., $20.00
        },
        quantity: 1,
      },
    ],
  });

  // 3) Create session as a response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  // remove the quary string from the URL
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.getAllBookings = Factory.getAll(Booking);
exports.createBooking = Factory.createOne(Booking);
exports.getBooking = Factory.getOne(Booking);
exports.updateBooking = Factory.UpdateOne(Booking);
exports.deleteBooking = Factory.deleteOne(Booking);
