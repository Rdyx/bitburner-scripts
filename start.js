import { autoBuyServers } from "autoBuyServers.js";
import { autoBuyAndUpgradeHacknetNodes } from "autoBuyAndUpgradeHacknetNodes.js";
import { tryNukeServer } from "tryNukeServer.js";

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
const SCRIPTS_LIST = ["autobaseLoops.js", "autoLowcostbaseLoops.js", "baseLoops.js"];
// Main hack script to "hard" hack
const HACK_SCRIPT_NAME = "autobaseLoops.js";
// Low cost hack script to fullfill remaining RAM
const LOWCOST_HACK_SCRIPT_NAME = "autoLowcostbaseLoops.js";
// Growth target
const TARGET_GROWTH = 10;
// Max grow run to avoid mega-unworthy-waits
const GROWTH_RUNS_CAP = 5;

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
 * @param {Array<Server>} serversList List of servers that will be hacked
 */
function execOnServer(ns, server, serversList) {
  const serverHostname = server.hostname;
  const serverMaxRAM = server.maxRam;
  const serverCoresNumber = server.cpuCores;

  const scriptRAMUsage = ns.getScriptRam(HACK_SCRIPT_NAME);
  const lowcostScriptRAMUsage = ns.getScriptRam(LOWCOST_HACK_SCRIPT_NAME);

  // 64 / (3*10) => 2 threads for all scripts
  // 16 / (3*10) => 1 thread max, all scripts wont run at max cost
  const threadsToUse = Math.floor(serverMaxRAM / (scriptRAMUsage * serversList.length)) || 1;

  // Stop running scripts
  //if (serverHostname !== 'home') ns.killall(serverHostname);
  ns.scriptKill("autobaseLoops.js", serverHostname);
  ns.scriptKill("autoLowcostbaseLoops.js", serverHostname);

  // Auto-launch scripts to hack each other server, we are using .every() to be able
  // To prematurely shutdown the loop (forEach doesn't support "break" keywork)
  // Any "false" will break the .every() loop
  serversList.every((serverTarget, index) => {
    const serverTargetHostname = serverTarget.hostname;
    const serverRAMAvailable = serverMaxRAM - ns.getServerUsedRam(serverHostname);
    const targetMinSecLvl = ns.getServerMinSecurityLevel(serverTargetHostname);

    // 32 / (2*(10-(7+1)))
    const lowcostThreadsToUse =
      Math.floor(serverRAMAvailable / (lowcostScriptRAMUsage * (serversList.length - (index + 1)))) || 1;

    // Launch big only if it's possible to start it at least N-Threads+1 more.
    // Else, prefer to fullfill with lowcost scripts
    // i.e: 7 >= 3.1*2
    if (serverRAMAvailable >= scriptRAMUsage * threadsToUse + 1) {
      return ns.exec(
        HACK_SCRIPT_NAME,
        serverHostname,
        threadsToUse,
        serverTargetHostname,
        targetMinSecLvl,
        threadsToUse,
        serverCoresNumber
      );
    } else if (serverRAMAvailable >= lowcostScriptRAMUsage * lowcostThreadsToUse + 1) {
      return ns.exec(LOWCOST_HACK_SCRIPT_NAME, serverHostname, lowcostThreadsToUse, serverTargetHostname);
    } else if (serverRAMAvailable >= lowcostScriptRAMUsage) {
      return ns.exec(LOWCOST_HACK_SCRIPT_NAME, serverHostname, 1, serverTargetHostname);
    } else {
      // Not enough RAM for anything, breaking loop.
      return 0;
    }
  });
}

/**
 * @param {NS} ns
 * @param {Array<Server>} serversList
 */
function getServersInfoFromServersList(ns, serversList) {
  return serversList.map((server) => ns.getServer(server));
}

/** @param {NS} ns */
export async function main(ns) {
  // Show log window
  ns.tail();

  const waitTimeArg = ns.args[0] || 20;
  // mins * 60 secs * 1000ms
  const waitTimeBetweenLoops = waitTimeArg * 60 * 1000;

  // Creating a loop to autofind & hack new servers every X ms
  while (1) {
    const playerHackLevel = ns.getHackingLevel();
    // Those servers are kinda special
    const specialServers = ns.serverExists("darkweb")
      ? getServersInfoFromServersList(ns, ["home", "darkweb"])
      : getServersInfoFromServersList(ns, ["home"]);

    let ownedServersList = getServersInfoFromServersList(ns, ns.getPurchasedServers());
    // Buy/Replace servers with better RAM
    await autoBuyServers(ns, ownedServersList);
    // Refresh ownedServersList
    ownedServersList = getServersInfoFromServersList(ns, ns.getPurchasedServers());

    // Get all servers
    const serversList = getNonOwnedServers(ns, ownedServersList);

    // Sort by available money, try to hack best profitable servers
    serversList.sort((x, y) => (x.moneyAvailable > y.moneyAvailable ? -1 : 1));

    // Exec things on all servers
    for (const server of serversList.concat(ownedServersList).concat(specialServers)) {
      // If we are not on one of our server, try to nuke it first
      if (serversList.includes(server)) {
        tryNukeServer(ns, playerHackLevel, server);
      }

      // If we don't have admin access to the server or server maxRam === 0, it's useless to get further
      if (!server.hasAdminRights) continue;

      // Overwrite/copy scripts on server
      await copyScripts(ns, server);

      execOnServer(
        ns,
        server,
        serversList.filter(
          (server) =>
            server.hasAdminRights && !server.purchasedByPlayer && server.hostname !== "darkweb" && server.moneyAvailable
        )
      );

      await ns.sleep(1000);
    }

    // Finally, dump rest of money into hacknet nodes
    await autoBuyAndUpgradeHacknetNodes(ns);

    ns.print(`Next loop at ${new Date(Date.now() + waitTimeBetweenLoops)}`);
    await ns.sleep(waitTimeBetweenLoops);
  }
}
