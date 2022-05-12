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
const SCRIPTS_LIST = ["autoBaseLoop.js", "autoLowcostBaseLoop.js", "baseLoops.js"];
// Main hack script to "hard" hack
const HACK_SCRIPT_NAME = "autoBaseLoop.js";
// Low cost hack script to fullfill remaining RAM
const LOWCOST_HACK_SCRIPT_NAME = "autoLowcostBaseLoop.js";

/** @param {NS} ns */
async function getOwnedServersList(ns) {
  const ownedServersList = getServersInfoFromServersList(ns, ns.getPurchasedServers());
  // Buy/Replace servers with better RAM
  await autoBuyServers(ns, ownedServersList);
  return getServersInfoFromServersList(ns, ns.getPurchasedServers());
}

/**
 * @param {NS} ns
 * @param {Array<string>} ownedServersHostnamesList List of owned servers' names
 * @param {Array<string>} serversList Optionnal - List of servers' names
 */
function getNonOwnedServersList(ns, ownedServersHostnamesList, serversList = ["home"]) {
  // Get all servers with pseudo-recursivity, make list of unique names with Set()
  for (let i = 0; i < serversList.length; i++) {
    serversList = [...new Set(serversList.concat(ns.scan(serversList[i])))];
  }

  // Remove purchased servers
  serversList = serversList.filter((server) => !ownedServersHostnamesList.includes(server));

  // Return list of servers info
  return serversList.map((server) => ns.getServer(server));
}

/**
 * @param {number} serverRAMAvailable Available RAM on server
 * @param {number} scriptRAMUsage RAM used by script
 * @param {number} serversListLength Number of servers left
 */
function getThreadsNumber(serverRAMAvailable, scriptRAMUsage, serversListLength) {
  return Math.floor(serverRAMAvailable / (scriptRAMUsage * serversListLength)) || 1;
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

  let serversListStartLength = serversList.length;

  // Stop running scripts
  ns.scriptKill(HACK_SCRIPT_NAME, serverHostname);
  ns.scriptKill(LOWCOST_HACK_SCRIPT_NAME, serverHostname);

  // Auto-launch scripts to hack each other server, we are using .every() to be able
  // To prematurely shutdown the loop (forEach doesn't support "break" keywork)
  // Any "false" will break the .every() loop
  serversList.every((serverTarget) => {
    const serverTargetHostname = serverTarget.hostname;
    const serverRAMAvailable = serverMaxRAM - ns.getServerUsedRam(serverHostname);
    const targetMinSecLvl = ns.getServerMinSecurityLevel(serverTargetHostname);

    // 64 / (3*10) => 2 threads for all scripts
    // 16 / (3*10) => 1 thread max, all scripts wont run at max cost
    const threadsToUse = getThreadsNumber(serverRAMAvailable, scriptRAMUsage, serversListStartLength);
    // 32 / (2*(10-(7+1)))
    const lowcostThreadsToUse = getThreadsNumber(serverRAMAvailable, lowcostScriptRAMUsage, serversListStartLength);

    serversListStartLength--;

    // If we can launch lowcost script with double thread but can't for "big" script, go for small script
    if (serverRAMAvailable <= scriptRAMUsage * 2 && serverRAMAvailable >= lowcostScriptRAMUsage * 2) {
      return ns.exec(LOWCOST_HACK_SCRIPT_NAME, serverHostname, 2, serverTargetHostname);
    } else if (serverRAMAvailable >= scriptRAMUsage * threadsToUse) {
      return ns.exec(
        HACK_SCRIPT_NAME,
        serverHostname,
        threadsToUse,
        serverTargetHostname,
        targetMinSecLvl,
        threadsToUse,
        serverCoresNumber
      );
    } else if (serverRAMAvailable >= lowcostScriptRAMUsage * lowcostThreadsToUse) {
      return ns.exec(LOWCOST_HACK_SCRIPT_NAME, serverHostname, lowcostThreadsToUse, serverTargetHostname);
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
  // Creating a loop to autofind & hack new servers every X ms
  while (1) {
    const playerHackLevel = ns.getHackingLevel();

    // Dynamic wait time based on player level
    const waitTimeArg = ns.args[0]
      ? ns.args[0]
      : playerHackLevel < 50
      ? 5
      : playerHackLevel < 100
      ? 10
      : playerHackLevel < 200
      ? 20
      : Math.round(playerHackLevel / 10);
    // mins * 60 secs * 1000ms
    const waitTimeBetweenLoops = waitTimeArg * 60 * 1000;

    // Those servers are kinda special
    const specialServers = getServersInfoFromServersList(ns, ["home"]);
    if (ns.serverExists("darkweb")) specialServers.push(getServersInfoFromServersList(ns, ["darkweb"]));

    const ownedServersList = await getOwnedServersList(ns);

    // Get all non owned servers
    const serversList = getNonOwnedServersList(
      ns,
      ownedServersList.concat(specialServers).map((x) => x.hostname)
    );

    // Sort by available money, try to hack best profitable servers
    serversList.sort((x, y) => (x.moneyAvailable > y.moneyAvailable ? 1 : -1));

    // Exec things on all servers
    for (const server of serversList.concat(ownedServersList).concat(specialServers)) {
      // If we are not on one of our server, try to nuke it first
      if (serversList.includes(server) && !server.purchasedByPlayer) {
        tryNukeServer(ns, playerHackLevel, server);
      }

      // If we don't have admin access to the server or server maxRam === 0, it's useless to get further
      if (!server.hasAdminRights) continue;

      // Overwrite/copy scripts on server
      await copyScripts(ns, server);

      execOnServer(
        ns,
        server,
        serversList.filter((server) => server.hasAdminRights && !server.purchasedByPlayer && server.moneyAvailable)
      );

      await ns.sleep(1000);
    }

    // Finally, dump rest of money into hacknet nodes
    await autoBuyAndUpgradeHacknetNodes(ns);

    ns.print(`Next loop at ${new Date(Date.now() + waitTimeBetweenLoops)}`);
    await ns.sleep(waitTimeBetweenLoops);
  }
}
