// KONFIGURASI PAYMENT GATEWAY
module.exports = {
  // ============= PAKASIR (QRIS OTOMATIS) =============
  pakasir: {
    apiKey: "vL86teuaOghrjUsoFp10WmuOESQwQ6bc", // GANTI DENGAN API KEY ASLI
    storeName: "bot-bos", // GANTI DENGAN NAMA STORE
    baseUrl: "https://api.pakasir.com", // ENDPOINT PAKASIR
    webhookUrl: ""
  },
  
  // ============= PEMBAYARAN MANUAL =============
  manualPayment: {
    dana: "085713933912",
    gopay: "085713933912"
  },
  
  // ============= KONTAK SUPPORT =============
  support: {
    telegram: "@kinzxxoffcial",
    whatsapp: "0895379234782"
  }
};