// Array<
//  * 	{
//  *	  "cpuCores":1,
//  *	  "ftpPortOpen":false,
//  *	  "hasAdminRights":false,
//  *	  "hostname":"ecorp",
//  *	  "httpPortOpen":false,
//  *	  "ip":"8.3.6.7",
//  *	  "isConnectedTo":false,
//  *	  "maxRam":0,
//  *	  "organizationName":"ECorp",
//  *	  "ramUsed":0,
//  *	  "smtpPortOpen":false,
//  *	  "sqlPortOpen":false,
//  *	  "sshPortOpen":false,
//  *	  "purchasedByPlayer":false,
//  *	  "backdoorInstalled":false,
//  *	  "baseDifficulty":99,
//  *	  "hackDifficulty":99,
//  *	  "minDifficulty":33,
//  *	  "moneyAvailable":36611133626,
//  *	  "moneyMax":915278340650,
//  *	  "numOpenPortsRequired":5,
//  *	  "openPortCount":0,
//  *	  "requiredHackingSkill":1267,
//  *	  "serverGrowth":99
//  * 	}>[]
//  *
//  *

// List of required scripts
const SCRIPTS_LIST = ["autoBaseLoop.js", "autoLowcostBaseLoop.js", "baseLoop.js"];
// Main hack script to "hard" hack
const HACK_SCRIPT_NAME = "autoBaseLoop.js";
// Low cost hack script to fullfill remaining RAM
const LOWCOST_HACK_SCRIPT_NAME = "autoLowcostBaseLoop.js";
// List of hacked servers to avoid loops within recursivity
// Growth target
const TARGET_GROWTH = 10;
// Max grow run to avoid mega-unworthy-waits
const GROWTH_RUNS_CAP = 20;

/**
 * @param {NS} ns
 * @param {Array<string>} ownedServersList Optionnal - List of owned servers
 * @param {Array<string>} serversList Optionnal - List of servers' names
 */
function getNonOwnedServers(ns, ownedServersList, serversList = ["home"]) {
  // Get all servers with pseudo-recursivity, make list of unique names with Set()
  for (let i = 0; i < serversList.length; i++) {
    serversList = [...new Set(serversList.concat(ns.scan(serversList[i])))];
  }

  // Remove purchased servers
  serversList = serversList.filter((server) => !ownedServersList.includes(server));

  // Return list of servers info
  return serversList.map((server) => ns.getServer(server));
}

/**
 * @param {NS} ns
 * @param {number} playerHackLevel Current player hack level
 * @param {Server} server Server info
 */
function tryNukeServer(ns, playerHackLevel, server) {
  const serverRequiredHackLevel = server.requiredHackingSkill;
  const serverNumOpenPortsRequired = server.numOpenPortsRequired;
  const serverHostname = server.hostname;

  let serverOpenPortCount = server.openPortCount;

  // If player doesn't have required hack level, no need to go further
  // Due to game design, we can also determine if a server has been hacked by
  // its current number of ports opened (default to 0)
  if (playerHackLevel < serverRequiredHackLevel || serverOpenPortCount >= serverNumOpenPortsRequired) return;

  // Try to hack each port
  if (!server.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(serverHostname), serverOpenPortCount++;
  if (!server.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home"))
    ns.relaysmtp(serverHostname), serverOpenPortCount++;
  if (!server.sqlPortOpen && ns.fileExists("SQLInject.exe", "home"))
    ns.sqlinject(serverHostname), serverOpenPortCount++;
  if (!server.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(serverHostname), serverOpenPortCount++;
  if (!server.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(serverHostname), serverOpenPortCount++;

  // If we have opened enough ports, nuke the server
  return serverOpenPortCount >= serverNumOpenPortsRequired
    ? (ns.nuke(serverHostname), (server.hasAdminRights = true))
    : ns.print(`Can't hack ${serverHostname} for now...`);
}

/**
 * @param {NS} ns
 * @param {Server} server Server info
 */
async function copyScripts(ns, server) {
  // Copy required scripts
  for (const script of SCRIPTS_LIST) {
    await ns.scp(script, server.hostname);
  }
}

/**
 * @param {NS} ns
 * @param {Server} server
 * @param {Array<Server>} serversList
 */
function execOnServer(ns, server, serversList) {
  const serverHostname = server.hostname;
  const serverMaxRAM = server.maxRam;
  const serverCoresNumber = server.cpuCores;

  const scriptRAMUsage = ns.getScriptRam(HACK_SCRIPT_NAME);
  const lowcostScriptRAMUsage = ns.getScriptRam(LOWCOST_HACK_SCRIPT_NAME);

  // 64 / (3*10) => 2 threads for all scripts
  // 16 / (3*10) => 1 thread max, all scripts wont run at max cost
  const threadsToUse = Math.floor(serverMaxRAM / (scriptRAMUsage * serversList.length)) + 1 || 1;

  // Stop running scripts
  ns.killall(serverHostname);

  // Auto-launch scripts to hack each other server, we are using .every() to be able
  // To prematurely shutdown the loop (forEach doesn't support "break" keywork)
  // Any "false" will break the .every() loop
  serversList.every((serverTarget) => {
    // Can't execute hack methods if target has not been nuked
    // if (!ns.hasRootAccess(serverTarget)) return 0;
    const serverTargetHostname = serverTarget.hostname;
    const serverRAMAvailable = serverMaxRAM - ns.getServerUsedRam(serverHostname);
    const targetMinSecLvl = ns.getServerMinSecurityLevel(serverTargetHostname);

    // Launch big only if it's possible to start it at least N-Threads+1 more.
    // Else, prefer to fullfill with lowcost scripts
    // i.e: 7 >= 3.1*2
    if (serverRAMAvailable >= scriptRAMUsage * threadsToUse + 1) {
      return ns.exec(
        HACK_SCRIPT_NAME,
        serverHostname,
        threadsToUse,
        serverTargetHostname,
        TARGET_GROWTH,
        GROWTH_RUNS_CAP,
        targetMinSecLvl,
        threadsToUse,
        serverCoresNumber
      );
    } else if (serverRAMAvailable >= lowcostScriptRAMUsage) {
      return ns.exec(LOWCOST_HACK_SCRIPT_NAME, serverHostname, 1, serverTargetHostname);
    } else {
      // Not enough RAM for anything, breaking loop.
      return 0;
    }
  });
}

/** @param {NS} ns */
export async function main(ns) {
  ns.print(ns.serverExists("darkweb"));
  // ns.print(ns.getServer('darkweb'))
  ns.print(ns.getPurchasedServers());

  // ns.singularity.installBackdoor()

  // const hasTor = ns.singularity.purchaseTor();

  // ns.purcha

  // if (hasTor) {
  // ns.print(ns.getDarkwebPrograms())
  // }
  // const waitTimeBetweenLoops = 3600000;

  // // Creating a loop to autofind & hack new servers every X ms
  // while (1) {
  //   const playerHackLevel = ns.getHackingLevel();
  //   const ownedServersList = ["home"].concat(ns.getPurchasedServers());

  //   // Get all servers
  //   const serversList = getNonOwnedServers(ns, ownedServersList);

  //   // Sort by available money, try to hack best profitable servers
  //   serversList.sort((x, y) => (x.moneyAvailable > y.moneyAvailable ? -1 : 1));

  //   // Exec things on all servers
  //   for (const server of serversList.concat(ownedServersList)) {
  //     // If we are not on one of our server, try to nuke it first
  //     if (serversList.includes(server)) {
  //       tryNukeServer(ns, playerHackLevel, server);
  //     }

  //     // If we don't have admin access to the server, it's useless to get further
  //     if (!server.hasAdminRights) continue;

  //     // Overwrite/copy scripts on server
  //     await copyScripts(ns, server);

  //     execOnServer(
  //       ns,
  //       server,
  //       serversList.filter((server) => server.hasAdminRights)
  //     );
  //   }

  //   ns.sleep(waitTimeBetweenLoops);
  // }

  // ns.hacknet.purchaseNode()

  let buyNodes = 1;

  while (buyNodes) {
    const buyNodeCost = ns.hacknet.getPurchaseNodeCost();
    // Get max of each, don't bother to buy lower upgrade levels (lazy mode on)
    const upgradeMaxNodeLevelsCost = 292914755.9116215; // ns.hacknet.getCoreUpgradeCost(n,15)
    const upgradeMaxNodeRAMCost = 4247930.409424215; // ns.hacknet.getRamUpgradeCost(n,6)
    const upgradeMaxNodeCoresCost = 21335671.049209587; // ns.hacknet.getLevelUpgradeCost(n,199)

    const overallBuyPrice = buyNodeCost + upgradeMaxNodeLevelsCost + upgradeMaxNodeRAMCost + upgradeMaxNodeCoresCost;

    if (ns.hacknet.numNodes() < maxWantedNodes && overallBuyPrice < ns.getPlayer().money) {
      // Buy node and upgrade everything at max
      const nodeNumber = ns.hacknet.purchaseNode();
      ns.hacknet.upgradeLevel(nodeNumber, 199);
      ns.hacknet.upgradeRam(nodeNumber, 6);
      ns.hacknet.upgradeCore(nodeNumber, 15);
    } else {
      buyNodes = 0;
    }
  }

  // ns.killall('lollilol-2')
  // ns.deleteServer('lollilol-2')
  // // Max 2**20 ($60.864b)
  // ns.purchaseServer('lollilol', 2**17) // 2**15 = $1.802b (x2 per **x)
  // ns.print(ns.getServer('lollilol'))
  // ns.print(ns.getPlayer().money)

  // ns.print(ns.getPurchasedServerCost(2**15))
  // formula: 2 (ram) || (110000)cost*((2**exponent)/2)

  // Number of purchasable servers
  // Math.floor(ns.getPlayer().money/(110000*((2**15)/2)))

  // function findHighestBuyableExponent(ns) {
  //   let exponent = 1;
  //   while (ns.getPurchasedServerCost(2 ** exponent) < ns.getPlayer().money) {
  //     exponent++
  //     // ns.print(ns.getPlayer().money, ' ', ns.getPurchasedServerCost(2**exponent))
  //   }
  //   exponent--
  //   return exponent
  // }

  // const exponent = findHighestBuyableExponent(ns);

  // let buyableServers = Math.floor(ns.getPlayer().money / (110000 * ((2 ** exponent) / 2)));
  // // Max 25 purchased servers
  // buyableServers = buyableServers > 25 ? 25 : buyableServers;

  // const ownedServersList = ns.getPurchasedServers().map((server) => ns.getServer(server));

  // // Sort owned servers by maxRam ascending
  // const ownedServersListSortedByRam = ownedServersList.sort((x, y) => x.maxRam > y.maxRam ? 1 : -1);
  // ownedServersListSortedByRam.forEach(s => ns.print(s.maxRam))

  // if (buyableServers != 0) {
  //   // If we have purchased maximum servers, we need to delete one and replace it
  //   if (ownedServersList.length === 25) {

  //     ownedServersListSortedByRam.every((server, i) => {
  //       const serverHostname = server.hostname;

  //       // If we have bought all servers we could or we have replaced all replacable servers, break
  //       if (buyableServers === 0 || i === ownedServersList) return 0;

  //       if (server.maxRam < 2 ** (exponent)) {
  //         ns.killall(serverHostname)
  //         ns.deleteServer(serverHostname)
  //         ns.purchaseServer(serverHostname, 2 ** exponent)
  //         buyableServers--
  //         return 1
  //       }
  //     })

  //     // If we have room for other servers, simply buy
  //   } else {
  //     ns.print('purchaseServer lollilol ', 2 ** exponent)
  //   }
  // }

  // while() {

  // }

  // While server cost < money, try next
  // If not purchasable or exponent > 20, stop

  // Replace server if total purchase = 25 and serverMaxRam < newServerMaxRam
  // break if not enough money

  //16 3.804
  // 17  7.608
  // 18 15.216
  // 19 30.432
  // 20 60.864
  //ns.singularity.purchaseServer('home', 2^13)
}
