const { cekStatusPakasir } = require('../payment-core');
const config = require('../config');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { orderId, amount } = req.method === 'GET' ? req.query : req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID dan amount diperlukan'
      });
    }
    
    const isPaid = await cekStatusPakasir(orderId, amount, { payment: { pakasir: config.pakasir } });
    
    return res.status(200).json({
      success: true,
      paid: isPaid,
      orderId: orderId,
      amount: amount
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      paid: false
    });
  }
};