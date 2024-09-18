class wheelofwhales {
  async login(tgData) {
    const url = "https://clicker-api.crashgame247.io/user/sync";
    const headers = { ...this.headers };
    try {
      const res = await this.http(url, headers, tgData);
      if (res.data) {
        logger.info("Login successful!");
        const { access_token, energy, points_per_tap } = res.data;
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
      logger.error(`Error during daily check-in: ${error.message}`);
    }
  }

  async tap(access_token, initialEnergy, points_per_tap) {
    const url = "https://clicker-api.crashgame247.io/meta/clicker";
    const headers = { ...this.headers, "X-Api-Key": access_token };
    let energy = initialEnergy;

    try {
      while (energy >= 50) {
        const randomEnergy = Math.floor(Math.random() * 41) + 10;
        let count = Math.floor((energy - randomEnergy) / points_per_tap);

        if (count <= 0) {
          logger.info("Not enough energy to continue tapping.");
          break;
        }

        const data = JSON.stringify({ count });
        const res = await this.http(url, headers, data);
        if (res.data) {
          const { mined, newEnergy } = res.data.mine;
          logger.info(`Tapped ${mined} times. Energy: ${newEnergy}`);
          energy = newEnergy;
        } else {
          logger.error("Tapping failed!");
          break;
        }
      }
    } catch (error) {
      logger.error(`Error during tapping: ${error.message}`);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitWithCountdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        colors.cyan(`Waiting ${i} seconds to continue...`)
      );
      await this.sleep(1000);
    }
    console.log("");
  }
}
