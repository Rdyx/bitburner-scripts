/**
 * @param {NS} ns
 * @param {string} serverName Name of target server
 */
function getCurrServerSecLvl(ns, serverName) {
  return ns.getServerSecurityLevel(serverName);
}

/**
 * @param {NS} ns
 * @param {string} serverName Name of target server
 * @param {number} currServerSecLvl Current target server security level
 * @param {number} serverMinSecLvl Target server minimum security level
 * @param {number} weakenServerLvlStatus Target server security decrease % from weaken()
 */
async function weakenServer(ns, serverName, currServerSecLvl, serverMinSecLvl, weakenServerLvlStatus) {
  // 1.5 > 1 && 1.5-1 >= .25
  while (currServerSecLvl > serverMinSecLvl && currServerSecLvl - serverMinSecLvl >= weakenServerLvlStatus) {
    ns.print(`${Math.floor((currServerSecLvl - serverMinSecLvl) / weakenServerLvlStatus)} weaken run(s) remaining.`);
    await ns.weaken(serverName);
    currServerSecLvl = getCurrServerSecLvl(ns, serverName);
  }
}

// TODO: keep?
/**
 * @param {NS} ns
 * @param {string} serverName Name of target server
 * @param {float} growthTarget Growth target
 * @param {number} growthRunsCap Maximum runs of growth to avoid to wait too much before hack()
 * @param {number} serverCoresNumber Number of cores used to grow
 */
function getTargetRequiredGrowthRun(ns, serverName, growthTarget, growthRunsCap, serverCoresNumber) {
  // Get number of grow runs to reach TARGET_GROWTH current state
  let targetRequiredGrowthRun = Math.ceil(ns.growthAnalyze(serverName, growthTarget, serverCoresNumber));
  // Set default value on special cases
  targetRequiredGrowthRun = [Infinity, NaN].includes(targetRequiredGrowthRun) ? 0 : targetRequiredGrowthRun;

  while (targetRequiredGrowthRun > growthRunsCap) {
    targetRequiredGrowthRun = Math.ceil(ns.growthAnalyze(serverName, growthTarget, serverCoresNumber));
    growthTarget = Math.floor((growthTarget - 0.001) * 1000) / 1000;

    // Sometimes 1.001 - 0.001 = 0.999 (JS Things you know), ensure we got minimum of 1
    growthTarget = growthTarget < 1 ? 1 : growthTarget;
  }

  return targetRequiredGrowthRun;
}

/**
 * @param {NS} ns
 * @param {string} serverName Name of target server
 */
async function growServer(ns, serverName) {
  let requiredGrowthRun = 10;
  let i = 0;

  // Also break the loop if the server currently has max money
  while (i < requiredGrowthRun && ns.getServerMaxMoney(serverName) !== ns.getServerMoneyAvailable(serverName)) {
    ns.print(`${requiredGrowthRun - i} grow run(s) required.`);
    await ns.grow(serverName);

    // Because we are running same scripts on same target on multiple servers,
    // we need to update the number of grow() runs after each grow() run
    i++;
  }
}

/**
 * Requires 4.10GB RAM
 * @param {NS} ns
 * @param {string} serverName Name of target server
 * @param {number} serverMinSecLvl Target server minimum security level
 * @param {number} serverCoresNumber Number of threads
 * @param {number} serverCoresNumber Number of cores
 */
export async function baseLoop(ns, serverName, serverMinSecLvl, threadsNumber, serverCoresNumber) {
  while (1) {
    const weakenServerLvlStatus = ns.weakenAnalyze(threadsNumber, serverCoresNumber);

    let currServerSecLvl = getCurrServerSecLvl(ns, serverName);

    await weakenServer(ns, serverName, currServerSecLvl, serverMinSecLvl, weakenServerLvlStatus);
    await growServer(ns, serverName);

    await ns.hack(serverName);
  }
}

/**
 * Requires 2.00GB RAM
 * @param {NS} ns
 * @param {string} serverName Name of target server
 */
export async function lowcostBaseLoop(ns, serverName) {
  while (1) {
    await ns.weaken(serverName);
    await ns.grow(serverName);
    await ns.hack(serverName);
  }
}

/**
 * Requires 1.70GB RAM
 * @param {NS} ns
 * @param {string} serverName Name of target server
 */
export async function lowcostNoGrowthBaseLoop(ns, serverName) {
  while (1) {
    await ns.hack(serverName);
  }
}
