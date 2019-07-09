// Modules
const docker = require("modules/docker");

/**
 * Gets a container's workingDir
 *
 * @param {string} containerName "DAppNodePackage-ropsten.dnp.dappnode.eth"
 * @returns {string} workingDir = "/usr/app/dnp"
 */
const fileBrowserGetWorkingDir = async ({ containerName }) => {
  const output = await docker.getContainerWorkingDir(containerName);
  const workingDir = (output || "/").replace(/['"]+/g, "") || "/";

  return {
    message: `Got ${containerName} workingDir`,
    result: workingDir
  };
};

module.exports = fileBrowserGetWorkingDir;
