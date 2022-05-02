# bitburner-scripts

Simple scripts storage for [bitburner game](https://store.steampowered.com/app/1812820/Bitburner/)

## Scripts

### start.js (>16GB RAM)

The main script. High RAM cost but handles <u>**everything**</u> related to nuke/hack/grow/weaken & servers & hacknet nodes.

You can use 1 arg to modify the time between loops (default to 20 minutes).

`run start.js [waitTime]`

### baseLoops.js (4.30GB RAM)

Base loops file. Handles the logic for hack/grow/weaken servers.

You have to copy this scripts into other servers if you want to use `autobaseLoops.js` and `autoLowcostbaseLoops.js`

### autoBaseLoop.js (3.30GB RAM)

Run `baseLoop()` from `baseLoops.js`.

`run autoBaseLoop.js serverName serverMinSecLvl threadsNumber serverCoresNumber`

### autoLowcostBaseLoop.js (2.00GB RAM)

Run `lowcostBaseLoop()` from `baseLoops.js`

`run autoLowcostBaseLoop.js serverName`

### tryNukeServer.js (4.05GB RAM)

Automatically hack ports & nuke a server if enough ports are opened.

`run tryNukeServer.js serverName`

### autoBuyServers.js

Automatically buy servers. Buy servers with minimum 8GB RAM. Trying to fullfill your max purchasable servers (25)
then start to upgrade them 1 by 1, buying each time the most powerfull server available with your money.

`run autoBuyServers.js [purchasedServersName]`

### autoBuyAndUpgradeHacknetNodes.js

Automatically buy and upgrade nodes in the most efficient manner. Feel free to ignore this script if you don't want
to optimize your hacknet nodes from a "hacky" way. In fact, the `calculateMoneyGainRate()` has been extracted from
`formulas.exe` because I wanted it to be available from start of any game (and to avoid 4GB RAM usage for 1 function).

_Note: if you have `formulas.exe`, feel free to replace the `calculateMoneyGainRate()` by
`ns.formulas.hacknetNodes.moneyGainRate()` if you want to use it the "normal" way._

`run autoBuyAndUpgradeHacknetNodes.js [maxWantedNodes]`

### test.js

Ignore it, only used for dev purposes.
