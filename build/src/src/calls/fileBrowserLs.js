const shell = require("utils/shell");
const parseLsOutput = require("utils/parseLsOutput");

/**
 * Executes and parses a `ls` command on the specified path
 *
 * @param {string} containerName "DAppNodePackage-ropsten.dnp.dappnode.eth"
 * @param {string} path
 * @param {bool} showAll Show hidden files
 * @returns {array} contents = [{
 *   isDirectory: false,
 *   permissions: "-rwxr-xr-x",
 *   numOfLinks: "2",
 *   ownerName: "root",
 *   ownerGroup: "root",
 *   size: "2745",
 *   month: "May",
 *   day: "9",
 *   time: "20:49",
 *   name: "Eth config.json"
 * }, ... ]
 */
const fileBrowserLs = async ({ containerName, path, showAll }) => {
  const output = await shell(
    `docker exec ${containerName} ls -l ${showAll ? "-a" : ""} ${path}`
  );
  const files = parseLsOutput(output);

  return {
    message: `Listed files of ${containerName} at ${path}`,
    result: files
  };
};

module.exports = fileBrowserLs;
