const { handlePakasirWebhook } = require('../payment-core');
const config = require('../config');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const body = req.body;
    console.log('[WEBHOOK RECEIVED]', JSON.stringify(body, null, 2));
    
    const result = await handlePakasirWebhook(body, config.pakasir);
    
    // Notifikasi pembayaran sukses
    if (result.success && result.paid) {
      console.log(`✅ PEMBAYARAN SUKSES! Order: ${result.orderId}, Amount: ${result.amount}`);
      // Di sini bisa kirim notifikasi ke Telegram/WhatsApp
    }
    
    return res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: result
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};