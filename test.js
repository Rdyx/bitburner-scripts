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
function getUpgradeEarningsPerDollarsSpent(cost, production) {
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

function getEfficientSpendingList(ns, nodeIndex, nodesInfo) {
  const purchaseNodeCost = ns.hacknet.getPurchaseNodeCost();

  const efficientSpendingList = [
    {
      nodeIndex: nodeIndex,
      productionPerDollarsSpent: getUpgradeEarningsPerDollarsSpent(purchaseNodeCost, calculateMoneyGainRate(1, 1, 1)),
      upgradeType: "node",
      upgradeCost: purchaseNodeCost,
    },
  ];

  for (const node of nodesInfo) {
    const nodeIndex = node.name.split("-").pop();

    let nodeObject = {
      nodeIndex: nodeIndex,
      productionPerDollarsSpent: 0,
      upgradeType: "",
      upgradeCost: 0,
    };

    const levelUpgradeCost = ns.hacknet.getLevelUpgradeCost(nodeIndex);
    const ramUpgradeCost = ns.hacknet.getRamUpgradeCost(nodeIndex);
    const coreUpgradeCost = ns.hacknet.getCoreUpgradeCost(nodeIndex);

    //gainRate/cost = prod/dollar

    const nextLevelProduction = calculateMoneyGainRate(node.level + 1, node.ram, node.cores);
    const nextRAMProduction = calculateMoneyGainRate(node.level, node.ram + 1, node.cores);
    const nextCoreProduction = calculateMoneyGainRate(node.level, node.ram, node.cores + 1);

    const nextLevelEarningPerDollarsSpent = getUpgradeEarningsPerDollarsSpent(levelUpgradeCost, nextLevelProduction);
    const nextRAMEarningPerDollarsSpent = getUpgradeEarningsPerDollarsSpent(ramUpgradeCost, nextRAMProduction);
    const nextCoreEarningPerDollarsSpent = getUpgradeEarningsPerDollarsSpent(coreUpgradeCost, nextCoreProduction);

    if (
      nextLevelEarningPerDollarsSpent > nextRAMEarningPerDollarsSpent &&
      nextLevelEarningPerDollarsSpent > nextCoreEarningPerDollarsSpent
    ) {
      nodeObject.productionPerDollarsSpent = nextLevelEarningPerDollarsSpent;
      nodeObject.upgradeType = "level";
      nodeObject.upgradeCost = levelUpgradeCost;
    } else if (nextRAMEarningPerDollarsSpent > nextCoreEarningPerDollarsSpent) {
      nodeObject.productionPerDollarsSpent = nextRAMEarningPerDollarsSpent;
      nodeObject.upgradeType = "ram";
      nodeObject.upgradeCost = ramUpgradeCost;
    } else {
      nodeObject.productionPerDollarsSpent = nextCoreEarningPerDollarsSpent;
      nodeObject.upgradeType = "cores";
      nodeObject.upgradeCost = coreUpgradeCost;
    }

    efficientSpendingList.push(nodeObject);
  }

  efficientSpendingList
    .filter((x) => x.productionPerDollarsSpent)
    .sort((x, y) => (x.productionPerDollarsSpent > y.productionPerDollarsSpent ? -1 : 1));

  return efficientSpendingList;
}
/** @param {NS} ns */
export async function main(ns) {
  ns.tail();

  const ownedNodesNumber = ns.hacknet.numNodes();

  const nodesInfo = getNodesStats(ns, ownedNodesNumber);

  const efficientSpendingList = getEfficientSpendingList(ns, ownedNodesNumber, nodesInfo);

  ns.print(nodesInfo);

  ns.print(efficientSpendingList);

  const upgradeType = efficientSpendingList[0].upgradeType;

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

  // Get the cheapest upgrade cost
  return efficientSpendingList.reduce((prev, curr) => (prev.upgradeCost < curr.upgradeCost ? prev : curr)).upgradeCost;

  // {'nodeIndex': 0, 'nodeProductionIncrease': 0, 'nodeUpgradeType': "buy_server"}

  // let buyNodes = 1;

  // while (buyNodes) {
  //   const buyNodeCost = ns.hacknet.getPurchaseNodeCost();
  //   // Get max of each, don't bother to buy lower upgrade levels (lazy mode on)
  //   const upgradeMaxNodeLevelsCost = 292914755.9116215; // ns.hacknet.getCoreUpgradeCost(n,15)
  //   const upgradeMaxNodeRAMCost = 4247930.409424215; // ns.hacknet.getRamUpgradeCost(n,6)
  //   const upgradeMaxNodeCoresCost = 21335671.049209587; // ns.hacknet.getLevelUpgradeCost(n,199)

  //   const overallBuyPrice = buyNodeCost+upgradeMaxNodeLevelsCost+upgradeMaxNodeRAMCost+upgradeMaxNodeCoresCost;

  //     if (ns.hacknet.numNodes() < maxWantedNodes && overallBuyPrice < ns.getPlayer().money) {
  //       // Buy node and upgrade everything at max
  //       const nodeNumber = ns.hacknet.purchaseNode();
  //       ns.hacknet.upgradeLevel(nodeNumber, 199)
  //       ns.hacknet.upgradeRam(nodeNumber, 6)
  //       ns.hacknet.upgradeCore(nodeNumber, 15)
  //     } else {
  //       buyNodes = 0;
  //     }
  // }
}
