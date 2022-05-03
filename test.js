// {
//   name: "hacknet-node-0",
//   level: 1,
//   ram: 1,
//   cores: 1,
//   production: 1.5,
//   timeOnline: 0.0,
//   totalProduction: 0.0,
// }

/**
 * @param {NS} ns
 * @param {number} nodesNumber
 */
function getNodesStats(ns, nodesNumber) {
  return Array(nodesNumber)
    .fill(0)
    .map((_, i) => ns.hacknet.getNodeStats(i));
}

/**
 * @param {number} cost Upgrade cost
 * @param {number} production Upgrade earnings
 * @returns Earning per dollar spent
 */
function getUpgradeEarningsPerDollarSpent(cost, production) {
  return (production / cost).toPrecision(10);
}

/**
 * Found this from formulas (#hackerMan). This allow to use this usefull formula
 * method without having to buy it... You can replace it by
 * ns.formulas.hacknetNodes.moneyGainRate() if you want (watch out extra RAM usage)
 *
 * @param {number} level Hacknode Level
 * @param {number} ram Number of RAM
 * @param {number} cores Number of cores
 * @param {number} mult Optionnal, default to 1 - Multiplier
 * @returns number
 */
function calculateMoneyGainRate(level, ram, cores, mult = 1) {
  const gainPerLevel = 1.5;

  const levelMult = level * gainPerLevel;
  const ramMult = Math.pow(1.035, ram - 1);
  const coresMult = (cores + 5) / 6;
  return levelMult * ramMult * coresMult * mult;
}

/**
 *
 * @param {NS} ns
 * @param {number} nodeIndex
 * @param {Array<NodeStats>} nodesInfo
 * @returns
 */
function getEfficientSpendingList(ns, nodeIndex, nodesInfo) {
  const purchaseNodeCost = ns.hacknet.getPurchaseNodeCost();

  let efficientSpendingList = [
    {
      nodeIndex: nodeIndex,
      productionPerDollarSpent: getUpgradeEarningsPerDollarSpent(purchaseNodeCost, calculateMoneyGainRate(1, 1, 1)),
      upgradeType: "node",
      upgradeCost: purchaseNodeCost,
    },
  ];

  for (const node of nodesInfo) {
    const nodeIndex = node.name.split("-").pop();

    let nodeObject = {
      nodeIndex: nodeIndex,
      productionPerDollarSpent: 0,
      upgradeType: "",
      upgradeCost: 0,
    };

    // Upgrade costs
    const levelUpgradeCost = ns.hacknet.getLevelUpgradeCost(nodeIndex);
    const ramUpgradeCost = ns.hacknet.getRamUpgradeCost(nodeIndex);
    const coreUpgradeCost = ns.hacknet.getCoreUpgradeCost(nodeIndex);

    // Upgrade earnings
    const nextLevelProduction = calculateMoneyGainRate(node.level + 1, node.ram, node.cores);
    const nextRAMProduction = calculateMoneyGainRate(node.level, node.ram + 1, node.cores);
    const nextCoreProduction = calculateMoneyGainRate(node.level, node.ram, node.cores + 1);

    // Upgrade earnings per dollar
    const nextLevelEarningPerDollarSpent = getUpgradeEarningsPerDollarSpent(levelUpgradeCost, nextLevelProduction);
    const nextRAMEarningPerDollarSpent = getUpgradeEarningsPerDollarSpent(ramUpgradeCost, nextRAMProduction);
    const nextCoreEarningPerDollarSpent = getUpgradeEarningsPerDollarSpent(coreUpgradeCost, nextCoreProduction);

    if (
      nextLevelEarningPerDollarSpent > nextRAMEarningPerDollarSpent &&
      nextLevelEarningPerDollarSpent > nextCoreEarningPerDollarSpent
    ) {
      nodeObject.productionPerDollarSpent = nextLevelEarningPerDollarSpent;
      nodeObject.upgradeType = "level";
      nodeObject.upgradeCost = levelUpgradeCost;
    } else if (nextRAMEarningPerDollarSpent > nextCoreEarningPerDollarSpent) {
      nodeObject.productionPerDollarSpent = nextRAMEarningPerDollarSpent;
      nodeObject.upgradeType = "ram";
      nodeObject.upgradeCost = ramUpgradeCost;
    } else {
      nodeObject.productionPerDollarSpent = nextCoreEarningPerDollarSpent;
      nodeObject.upgradeType = "cores";
      nodeObject.upgradeCost = coreUpgradeCost;
    }

    efficientSpendingList.push(nodeObject);
  }

  // Remove maxxed nodes
  efficientSpendingList = efficientSpendingList.filter((x) => x.productionPerDollarSpent > 0);
  // Sort nodes desc by efficient upgrade cost
  efficientSpendingList.sort((x, y) => (x.productionPerDollarSpent > y.productionPerDollarSpent ? -1 : 1));

  return efficientSpendingList;
}
/** @param {NS} ns */
export async function main(ns) {
  ns.tail();

  const ownedNodesNumber = ns.hacknet.numNodes();
  const nodesInfo = getNodesStats(ns, ownedNodesNumber);
  const efficientSpendingList = getEfficientSpendingList(ns, ownedNodesNumber, nodesInfo);

  ns.print(nodesInfo);

  ns.print("ttt", efficientSpendingList);

  // Due to desc sort, 1st index is the best choice to upgrade
  const upgradeType = efficientSpendingList[0].upgradeType;

  // Execute different things depending on best upgrade type
  if (upgradeType === "node") {
    ns.print("buy node");
    // ns.hacknet.purchaseNode();
  } else if (upgradeType === "level") {
    // ns.hacknet.upgradeLevel(efficientSpendingList[0]);
  } else if (upgradeType === "ram") {
    // ns.hacknet.upgradeRam(efficientSpendingList[0]);
  } else {
    // ns.hacknet.upgradeCore(efficientSpendingList[0]);
  }

  // Return the cheapest upgrade cost found among the list
  return efficientSpendingList.reduce((prev, curr) => (prev.upgradeCost < curr.upgradeCost ? prev : curr)).upgradeCost;
}
