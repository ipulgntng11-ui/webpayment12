const { createdQris, toRupiah } = require('../payment-core');
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
    const { amount } = req.body;
    
    // Validasi nominal
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Nominal tidak boleh kosong'
      });
    }
    
    const nominal = parseInt(amount);
    
    // ============= NOMINAL BEBAS: 1.000 - 10.000.000 =============
    if (nominal < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimal pembayaran Rp 1.000'
      });
    }
    
    if (nominal > 10000000) {
      return res.status(400).json({
        success: false,
        message: 'Maksimal pembayaran Rp 10.000.000'
      });
    }
    
    // Konfigurasi Pakasir
    const paymentConfig = {
      payment: {
        pakasir: config.pakasir
      },
      webhookUrl: config.pakasir.webhookUrl
    };
    
    // Create payment QRIS
    const payment = await createdQris(nominal, paymentConfig);
    
    if (!payment) {
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat QRIS, silakan coba lagi'
      });
    }
    
    // Convert QR buffer ke base64
    let qrBase64 = null;
    if (payment.imageqris && Buffer.isBuffer(payment.imageqris)) {
      qrBase64 = `data:image/png;base64,${payment.imageqris.toString('base64')}`;
    }
    
    return res.status(200).json({
      success: true,
      data: {
        id: payment.idtransaksi,
        amount: payment.jumlah,
        amountFormatted: toRupiah(payment.jumlah),
        qrCode: qrBase64,
        qrString: payment.qr_string,
        paymentUrl: payment.payment_url,
        merchant: payment.merchant_name || 'QRIS Payment',
        expiry: payment.expiry || '15 menit'
      }
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};