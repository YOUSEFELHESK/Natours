/* eslint-disable no-undef */
/* eslint-disable*/

import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51PxH3BC7RIqE52A5Ff8gDDUFNmGN644b4ZEoRQV2o6cdR4ag21SX1SDzFbeQdCAzqDbMcnsI16bl4Enf1gYbZ1og00bff97gdU'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    // console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
