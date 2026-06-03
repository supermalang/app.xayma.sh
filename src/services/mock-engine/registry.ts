/**
 * Imports each mock operation file. Each operation file calls
 * registerMock() at its module top so this single import wires
 * them all up.
 *
 * Add new operations by importing them here.
 */

import './operations/sendNotification.mock'
import './operations/initiateCheckout.mock'
import './operations/handlePaymentCallback.mock'
import './operations/redeemVoucher.mock'
import './operations/generateVouchers.mock'

export {}
