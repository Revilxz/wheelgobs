const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors/safe");
const readline = require("readline");
const { performance } = require("perf_hooks");
const winston = require("winston");

// Buat logger kustom menggunakan Winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      let coloredLevel;
      switch (level) {
        case "info":
          coloredLevel = colors.blue(level.toUpperCase());
          break;
        case "warn":
          coloredLevel = colors.yellow(level.toUpperCase());
          break;
        case "error":
          coloredLevel = colors.red(level.toUpperCase());
          break;
        default:
          coloredLevel = level.toUpperCase();
      }
      return `${timestamp} | ${coloredLevel} | ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

class App {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://clicker-api.crashgame247.io",
      Referer: "https://clicker-api.crashgame247.io/",
      "Sec-Ch-Ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    };
    this.line = colors.white("-".repeat(42));
  }

  async http(url, headers, data = null) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        let res;
        if (data === null) {
          res = await axios.get(url, { headers });
        } else {
          res = await axios.post(url, data, { headers });
        }
        if (typeof res.data !== "object") {
          logger.error("Tidak menerima respons JSON yang valid!");
          attempts++;
          await this.sleep(2000);
          continue;
        }
        return res;
      } catch (error) {
        attempts++;
        logger.error(
          `Kesalahan koneksi (Percobaan ${attempts}/${maxAttempts}): ${error.message}`
        );

        if (attempts < maxAttempts) {
          await this.sleep(5000);
        } else {
          break;
        }
      }
    }
    throw new Error("Tidak dapat terhubung setelah 3 percobaan");
  }

  async login(tgData) {
    const url = "https://clicker-api.crashgame247.io/user/sync";
    const headers = { ...this.headers };
    try {
      const res = await this.http(url, headers, tgData);
      if (res.data) {
        logger.info("Login berhasil!");
        const { balance, energy, max_energy, access_token } = res.data;
        logger.info(`Saldo: ${balance}`);
        logger.info(`Energi: ${energy}/${max_energy}`);
        return { access_token, energy };
      } else {
        logger.error("Login gagal!");
        return null;
      }
    } catch (error) {
      logger.error(`Kesalahan: ${error.message}`);
      return null;
    }
  }

  async daily(access_token) {
    const url = "https://clicker-api.crashgame247.io/user/bonus/claim";
    const headers = { ...this.headers, "X-Api-Key": access_token };

    try {
      const checkRes = await this.http(url, headers);
      if (checkRes.data && checkRes.data.has_available) {
        logger.info("Check-in harian tersedia!");
        const claimRes = await this.http(url, headers, "");
        if (claimRes.data) {
          logger.info("Check-in harian berhasil!");
        } else {
          logger.error("Check-in harian gagal!");
        }
      } else {
        logger.info("Check-in harian sudah diklaim hari ini.");
      }
    } catch (error) {
      logger.error(
        `Kesalahan saat memeriksa atau mengklaim bonus harian: ${error.message}`
      );
    }
  }

  async tap(access_token, initialEnergy) {
    const url = "https://clicker-api.crashgame247.io/meta/clicker";
    const headers = {
      ...this.headers,
      "X-Api-Key": access_token,
      "Content-Type": "application/json",
    };
    let energy = initialEnergy;

    try {
      while (energy >= 50) {
        const randomEnergy = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
        let count = Math.floor((energy - randomEnergy) / 10); // Asumsikan points_per_tap = 10

        if (count <= 0) {
          logger.info(
            "Energi tidak cukup untuk melanjutkan tap, mengganti akun!"
          );
          break;
        }

        const data = JSON.stringify({ count });

        const res = await this.http(url, headers, data);
        if (res.data) {
          const { balance, mined, newEnergy } = res.data;
          logger.info(
            `Taps: ${mined} | Saldo: ${balance} | Energi: ${newEnergy}`
          );

          energy = newEnergy;

          if (energy < 50) {
            logger.info(
              "Energi terlalu rendah untuk melanjutkan tap, mengganti akun!"
            );
            break;
          }
        } else {
          logger.error("Kesalahan, tidak dapat tap!");
          break;
        }
      }
    } catch (error) {
      logger.error(`Kesalahan: ${error.message}`);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
      })
    );
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        colors.cyan(
          `Selesai dengan semua akun, menunggu ${i} detik untuk melanjutkan loop`
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    if (data.length <= 0) {
      logger.error("Tidak ada akun yang ditambahkan!");
      process.exit();
    }
    console.log(this.line);

    const buyCards = await this.askQuestion(
      colors.cyan("Apakah Anda ingin membeli kartu baru? (y/n): ")
    );
    const buyCardsDecision = buyCards.toLowerCase() === "y";

    const upgradeMyCards = await this.askQuestion(
      colors.cyan("Apakah Anda ingin mengupgrade kartu? (y/n): ")
    );
    const upgradeMyCardsDecision = upgradeMyCards.toLowerCase() === "y";

    while (true) {
      const start = performance.now();

      for (const [index, tgData] of data.entries()) {
        const userData = JSON.parse(
          decodeURIComponent(tgData.split("&")[1].split("=")[1])
        );
        const firstName = userData.first_name;
        logger.info(`Akun ${index + 1}/${data.length} | ${firstName}`);

        const loginData = await this.login(tgData);
        if (!loginData) {
          logger.error("Login gagal, melanjutkan ke akun berikutnya.");
          continue;
        }

        const { access_token, energy } = loginData;

        if (access_token) {
          await this.daily(access_token);
          await this.tap(access_token, energy);
        }

        await this.sleep(5000);
      }

      await this.waitWithCountdown(60);
    }
  }
}

if (require.main === module) {
  process.on("SIGINT", () => {
    console.log(
      colors.yellow("\nMematikan secara bersih dari SIGINT (Ctrl+C)")
    );
    process.exit();
  });

  new App().main().catch((error) => {
    logger.error(`Kesalahan dalam aplikasi: ${error.message}`);
    process.exit(1);
  });
}
