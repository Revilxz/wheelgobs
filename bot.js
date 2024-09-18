const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const fs = require('fs');

// Ganti dengan API token yang kamu dapatkan dari inspect
const token = 'https://clicker-api.crashgame247.io/';  
const bot = new TelegramBot(token, { polling: true });

// Membaca data dari file saat bot dimulai
let userData = {};
if (fs.existsSync('data.txt')) {
    userData = JSON.parse(fs.readFileSync('data.txt', 'utf8'));
}

// Menyimpan data ke file setiap kali ada perubahan
const simpanData = () => {
    fs.writeFileSync('data.txt', JSON.stringify(userData, null, 2));
};

// Fungsi untuk memberikan energi tambahan setiap 1 jam
const tambahEnergi = () => {
    const sekarang = Date.now();
    for (let chatId in userData) {
        let user = userData[chatId];
        const waktuTerlewat = Math.floor((sekarang - user.lastTap) / (60 * 60 * 1000)); // 1 jam = 3600000 ms
        if (waktuTerlewat > 0) {
            const energiTambah = waktuTerlewat * 100; // 100 energi per jam
            user.energy = Math.min(user.energy + energiTambah, 1000);
            user.lastTap = sekarang; // Update waktu terakhir
        }
    }
    simpanData(); // Simpan perubahan setelah energi bertambah
};

// Menjadwalkan fungsi tambahEnergi setiap jam
schedule.scheduleJob('0 * * * *', tambahEnergi); // Setiap jam

// Fungsi untuk memulai daily login
bot.onText(/\/start|\/login/, (msg) => {
    const chatId = msg.chat.id;
    if (!userData[chatId]) {
        userData[chatId] = {
            energy: 1000,
            lastLogin: Date.now(),
            lastTap: Date.now()
        };
        bot.sendMessage(chatId, "Selamat datang! Kamu mendapatkan 1000 energi.");
        simpanData();  // Simpan perubahan setelah login
    } else {
        bot.sendMessage(chatId, "Kamu sudah login hari ini.");
    }
});

// Fungsi untuk melakukan tap
bot.onText(/\/tap/, (msg) => {
    const chatId = msg.chat.id;
    let user = userData[chatId];

    if (!user) {
        bot.sendMessage(chatId, "Kamu belum login! Ketik /login untuk memulai.");
        return;
    }

    const sekarang = Date.now();

    // Tambah energi jika sudah ada waktu yang lewat
    const waktuTerlewat = Math.floor((sekarang - user.lastTap) / (60 * 60 * 1000)); // 1 jam = 3600000 ms
    if (waktuTerlewat > 0) {
        const energiTambah = waktuTerlewat * 100; // 100 energi per jam
        user.energy = Math.min(user.energy + energiTambah, 1000);
        user.lastTap = sekarang;
    }

    if (user.energy >= 100) {
        user.energy -= 100;
        bot.sendMessage(chatId, `Kamu melakukan tap! Energi tersisa: ${user.energy}`);

        // Random hadiah dari roulette
        const hadiah = ["100 Coin", "200 Coin", "500 Coin", "1x Lucky Spin"];
        const hadiahAcak = hadiah[Math.floor(Math.random() * hadiah.length)];
        bot.sendMessage(chatId, `Selamat! Kamu mendapatkan: ${hadiahAcak}`);
        simpanData();  // Simpan perubahan setelah tap
    } else {
        bot.sendMessage(chatId, "Energi kamu habis! Tunggu hingga energimu terisi kembali.");
    }
});
