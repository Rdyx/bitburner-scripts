/** @param {NS} ns */
function findHighestBuyableExponent(ns) {
  let exponent = 1;
  while (ns.getPurchasedServerCost(2 ** exponent) < ns.getPlayer().money) {
    exponent++;
  }
  exponent--;
  return exponent;
}

/**
 *
 * @param {NS} ns
 * @param {number} exponent
 * @returns
 */
function getBuyableServersNumber(ns, exponent) {
  return Math.floor(ns.getPlayer().money / (110000 * (2 ** exponent / 2)));
}

/**
 * @param {NS} ns
 * @param {Array<Server>} ownedServersList List of owned/purchased servers
 * @param {string} purchasedServersName Optionnal, default to "UwU" - Custom name for purchased servers
 * */
export async function autoBuyServers(ns, ownedServersList, purchasedServersName = "UwU") {
  const freeServersSlots = 25 - ns.getPurchasedServers().length;
  // Sort owned servers by maxRam ascending
  const ownedServersListSortedByRam = ownedServersList.sort((x, y) => (x.maxRam > y.maxRam ? 1 : -1));

  let exponent = findHighestBuyableExponent(ns);
  let buyableServers = getBuyableServersNumber(ns, exponent);
  // Max 25 purchased servers
  buyableServers = buyableServers > 25 ? 25 : buyableServers;

  // Buy only servers with 8GB RAM minimum
  if (buyableServers != 0 && exponent >= 3) {
    // If we have purchased maximum servers, we need to delete one and replace it
    if (ownedServersList.length === 25) {
      ownedServersListSortedByRam.every((server, i) => {
        const serverHostname = server.hostname;

        // If we have bought all servers we could or we have replaced all replacable servers, break
        if (buyableServers === 0 || i === ownedServersList) return 0;

        if (server.maxRam < 2 ** exponent) {
          ns.killall(serverHostname);
          ns.deleteServer(serverHostname);
          ns.purchaseServer(serverHostname, 2 ** exponent);
          buyableServers--;
          return 1;
        }
      });

      // If we have room for other servers, simply buy
    } else {
      // Fullfill available servers slots, find the highest exponent able to fill
      while (buyableServers < freeServersSlots && exponent > 0) {
        buyableServers = getBuyableServersNumber(ns, exponent);
        exponent--;

        await ns.sleep(20);
      }

      // If the found exponent allows us to buy more servers than free slots, buy enough to fill free slots
      buyableServers = buyableServers > freeServersSlots ? freeServersSlots : buyableServers;

      while (buyableServers > 0) {
        if (ns.getPurchasedServers().length < 25) {
          ns.purchaseServer(purchasedServersName, 2 ** exponent);
          buyableServers--;
        } else {
          // If we reached max purchased servers cap while buying, restart function
          autoBuyServers(
            ns,
            ns.getPurchasedServers().map((server) => ns.getServer(server)),
            purchasedServersName
          );
          break;
        }

        // Avoid while loop freezes
        await ns.sleep(20);
      }
    }
  }
}
