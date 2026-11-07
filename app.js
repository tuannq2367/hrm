/**
 * File khởi chạy chính cho cPanel (Setup Node.js App - Phusion Passenger)
 * Điểm vào: app.js
 */
require('dotenv').config();
require('./apps/api/dist/src/main');
