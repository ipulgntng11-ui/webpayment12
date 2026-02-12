const axios = require("axios");
const QRCode = require("qrcode");

// Format Rupiah
const toRupiah = (angka) => {
  return Number(angka).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).replace("IDR", "Rp").trim();
};

// Generate ID Transaksi
function generateReffId() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `TRX-${Date.now()}-${rand}`;
}

// ================= PAKASIR FUNCTIONS =================
async function createQrisPakasir(amount, orderId, config) {
  try {
    const { apiKey, storeName, baseUrl } = config.payment?.pakasir || config;
    
    if (!apiKey || !storeName || !baseUrl) {
      throw new Error("Config Pakasir tidak lengkap!");
    }
    
    const uniqueOrderId = orderId || `PAKASIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[PAKASIR] Membuat transaksi: Rp ${amount} - Order: ${uniqueOrderId}`);
    
    // Create transaction via Pakasir API
    const response = await axios.post(
      `${baseUrl}/api/transaction/create`,
      {
        api_key: apiKey,
        amount: parseInt(amount),
        order_id: uniqueOrderId,
        store_name: storeName,
        payment_method: "qris",
        description: `Pembayaran Order ${uniqueOrderId}`,
        customer_email: "customer@payment.com",
        redirect_url: `https://t.me/kinzxxoffcial`,
        webhook_url: config.webhookUrl || `${baseUrl}/webhook`
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );
    
    console.log('[PAKASIR] Response:', response.data);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || "Gagal membuat transaksi");
    }
    
    const data = response.data.data;
    
    // Generate QR code dari payment URL
    const paymentUrl = data.payment_url || data.qr_string || `${baseUrl}/pay/${storeName}/${uniqueOrderId}`;
    
    const qrBuffer = await QRCode.toBuffer(paymentUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return {
      success: true,
      data: {
        idtransaksi: data.order_id || uniqueOrderId,
        jumlah: amount,
        imageqris: qrBuffer,
        qr_string: paymentUrl,
        payment_url: paymentUrl,
        merchant_name: storeName,
        expiry: data.expiry || null
      }
    };
    
  } catch (error) {
    console.error("[PAKASIR ERROR]:", error.message);
    if (error.response) {
      console.error("[PAKASIR ERROR Response]:", error.response.data);
    }
    return {
      success: false,
      message: error.message
    };
  }
}

async function cekStatusPakasir(orderId, amount, config) {
  try {
    const { apiKey, baseUrl } = config.payment?.pakasir || config;
    
    if (!apiKey || !baseUrl) {
      throw new Error("Config Pakasir tidak lengkap!");
    }
    
    console.log(`[PAKASIR] Cek status: ${orderId}`);
    
    const response = await axios.get(
      `${baseUrl}/api/transaction/status/${orderId}`,
      {
        headers: {
          "X-API-Key": apiKey,
          "Accept": "application/json"
        },
        timeout: 10000
      }
    );
    
    if (!response.data || !response.data.success) {
      return false;
    }
    
    const status = response.data.data?.status?.toLowerCase();
    const responseAmount = parseInt(response.data.data?.amount || 0);
    const isPaid = (status === "paid" || status === "success" || status === "settlement") && 
                  responseAmount === parseInt(amount);
    
    console.log(`[PAKASIR] Status: ${status}, Amount: ${responseAmount}, Paid: ${isPaid}`);
    
    return isPaid;
    
  } catch (error) {
    console.error("[PAKASIR Cek Status Error]:", error.message);
    return false;
  }
}

// ================= MAIN CREATE FUNCTION =================
async function createdQris(harga, config) {
  const amount = Number(harga);
  
  // PAKASIR (DEFAULT)
  try {
    const result = await createQrisPakasir(amount, null, config);
    
    if (!result.success) {
      throw new Error(result.message || "Gagal membuat QRIS");
    }
    
    return {
      idtransaksi: result.data.idtransaksi,
      jumlah: amount,
      imageqris: result.data.imageqris,
      qr_string: result.data.qr_string,
      payment_url: result.data.payment_url,
      nominal: amount,
      merchant_name: result.data.merchant_name
    };
    
  } catch (error) {
    console.error("[CREATE QRIS ERROR]:", error.message);
    return null;
  }
}

// ================= WEBHOOK HANDLER =================
async function handlePakasirWebhook(body, config) {
  try {
    const { order_id, status, amount, signature } = body;
    
    console.log(`[WEBHOOK] Order: ${order_id}, Status: ${status}, Amount: ${amount}`);
    
    if (status === "paid" || status === "success" || status === "settlement") {
      return {
        success: true,
        orderId: order_id,
        status: status,
        amount: amount,
        paid: true
      };
    }
    
    return {
      success: true,
      orderId: order_id,
      status: status,
      amount: amount,
      paid: false
    };
    
  } catch (error) {
    console.error("[WEBHOOK ERROR]:", error.message);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  createQrisPakasir,
  cekStatusPakasir,
  createdQris,
  handlePakasirWebhook,
  toRupiah,
  generateReffId
};