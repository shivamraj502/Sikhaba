const cron = require('node-cron');
const { pool } = require('../config/db');

function startExpireSubscriptionsJob() {
  // Runs once a day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const [result] = await pool.query(
        `UPDATE subscriptions SET status = 'expired' 
         WHERE status = 'active' AND end_date < CURDATE()`
      );
      console.log(`🕛 Expired ${result.affectedRows} subscriptions`);
    } catch (err) {
      console.error('Error expiring subscriptions:', err.message);
    }
  });
}

module.exports = startExpireSubscriptionsJob;