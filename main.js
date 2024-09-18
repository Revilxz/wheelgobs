const axios = require("axios");
const colors = require("colors/safe");
const { performance } = require("perf_hooks");
const winston = require("winston");

// Create a custom logger using Winston
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

class wheelofwhale {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    };
  }

  // 1. Login function
  async login(tgData) {
    const url = "https://clicker-api.crashgame247.io/user/sync ";
    const headers = { ...this.headers };
    try {
      const res = await this.http(url, headers, tgData);
      if (res.data) {
        logger.info("Login successful!");
        const { balance, energy, max_energy, access_token, league } = res.data;
        const points_per_tap = league.points_per_tap;
        logger.info(`Balance: ${balance}`);
        logger.info(`Energy: ${energy}/${max_energy}`);
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

  // 2. Daily check-in function
  async daily(access_token) {
    const checkUrl = "https://clicker-api.crashgame247.io/user/bonus/check";
    const claimUrl = "https://clicker-api.crashgame247.io/user/bonus/claim";
    const headers = { ...this.headers, "X-Api-Key": access_token };

    try {
      const checkRes = await this.http(checkUrl, headers);
      if (checkRes.data && checkRes.data.has_available) {
        logger.info("Daily check-in available!");
        const claimRes = await this.http(claimUrl, headers, "");
        if (claimRes.data) {
          logger.info("Daily check-in successful!");
        } else {
          logger.error("Daily check-in failed!");
        }
      } else {
        logger.info("Daily check-in already claimed today.");
      }
    } catch (error) {
      logger.error(
        `Error when checking or claiming daily bonus: ${error.message}`
      );
    }
  }

  // 5. Tapping function
  async tap(access_token, initialEnergy, points_per_tap) {
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
        let count = Math.floor((energy - randomEnergy) / points_per_tap);

        if (count <= 0) {
          logger.info(
            "Not enough energy to continue tapping switching account!"
          );
          break;
        }

        const data = JSON.stringify({ count });

        const res = await this.http(url, headers, data);
        if (res.data) {
          const { balance, mined, newEnergy } = res.data.mine;

          logger.info(
            `Tapped ${mined} times | Balance: ${balance} | Energy: ${newEnergy}`
          );

          energy = newEnergy;

          if (energy < 50) {
            logger.info(
              "Energy too low to continue tapping, switching account!"
            );
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

  // 8. Sleep function (wait for a certain number of milliseconds)
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 9. Countdown timer function
  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      process.stdout.write(
        colors.cyan(
          `Completed all accounts, waiting ${i} seconds to continue the loop\r`
        )
      );
      await this.sleep(1000);
    }
    console.log(""); // Move to a new line after the countdown
  }

  // HTTP request helper function
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
}

module.exports = wheelofwhales;
