const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors/safe");
const readline = require("readline");
const { performance } = require("perf_hooks");
const winston = require("winston");

// Logger setup using Winston
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

class ClickerBot {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
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
          logger.error("Did not receive a valid JSON response!");
          attempts++;
          await this.sleep(2000);
          continue;
        }
        return res;
      } catch (error) {
        attempts++;
        logger.error(
          `Connection error (Attempt ${attempts}/${maxAttempts}): ${error.message}`
        );

        if (attempts < maxAttempts) {
          await this.sleep(5000);
        } else {
          break;
        }
      }
    }
    throw new Error("Unable to connect after 3 attempts");
  }

  async login(tgData) {
    const url = "https://clicker.crashgame247.io/";
    const headers = { ...this.headers };

    try {
      const res = await this.http(url, headers, tgData);
      if (res.data) {
        logger.info("Login successful!");
        const { access_token, energy, points_per_tap } = res.data;
        logger.info(`Energy: ${energy}`);
        logger.info(`Points per tap: ${points_per_tap}`);
        return { access_token, energy, points_per_tap };
      } else {
        logger.error("Login failed!");
        return null;
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      return null;
    }
  }

  async daily(access_token) {
    const url = "https://clicker-api.crashgame247.io/user/bonus/claim";
    const headers = { ...this.headers, "Authorization": `Bearer ${access_token}` };

    try {
      const res = await this.http(url, headers);
      if (res.data) {
        logger.info("Daily check-in successful!");
      } else {
        logger.error("Daily check-in failed!");
      }
    } catch (error) {
      logger.error(`Error when claiming daily bonus: ${error.message}`);
    }
  }

  async tap(access_token, initialEnergy, points_per_tap) {
    const url = "https://clicker-api.crashgame247.io/meta/clicker";
    const headers = {
      ...this.headers,
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };
    let energy = initialEnergy;

    try {
      while (energy >= 50) {
        const count = Math.floor(energy / points_per_tap);
        if (count <= 0) {
          logger.info("Not enough energy to continue tapping!");
          break;
        }

        const data = JSON.stringify({ count });

        const res = await this.http(url, headers, data);
        if (res.data) {
          const { balance, mined, newEnergy } = res.data;

          logger.info(`Tapped ${mined} times | Balance: ${balance} | Energy: ${newEnergy}`);

          energy = newEnergy;

          if (energy < 50) {
            logger.info("Energy too low to continue tapping!");
            break;
          }
        } else {
          logger.error("Error, unable to tap!");
          break;
        }
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        colors.cyan(
          `Completed all accounts, waiting ${i} seconds to continue the loop`
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
      logger.error("No accounts added!");
      process.exit();
    }
    console.log(this.line);

    while (true) {
      const start = performance.now();

      for (const [index, tgData] of data.entries()) {
        const userData = JSON.parse(
          decodeURIComponent(tgData.split("&")[1].split("=")[1])
        );
        const firstName = userData.first_name;
        logger.info(`Account ${index + 1}/${data.length} | ${firstName}`);

        const loginData = await this.login(tgData);
        if (!loginData) {
          logger.error("Login failed, moving to the next account.");
          continue;
        }

        const { access_token, energy, points_per_tap } = loginData;

        if (access_token) {
          await this.daily(access_token);
          await this.tap(access_token, energy, points_per_tap);
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
      colors.yellow("\nGracefully shutting down from SIGINT (Ctrl+C)")
    );
    process.exit();
  });

  new ClickerBot().main().catch((error) => {
    logger.error(`Unhandled error in main execution: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  });
}
