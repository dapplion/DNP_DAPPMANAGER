import semver from "semver";
// Internal
import * as safeSemver from "../utils/safeSemver";
import aggregateDependencies from "./aggregateDependencies";
import getRelevantInstalledDnps from "./getRelevantInstalledDnps";
import { PackageContainer, PackageRequest } from "../../../types";
import { DappGetDnps, DappGetFetchFunction } from "../types";
import Logs from "../../../logs";
const logs = Logs(module);

/**
 * Aggregates all relevant packages and their info given a specific request.
 * The resulting "repo" (dnps) can be run directly through a brute force resolver
 * as it only includes DNPs of interest to that specific user request
 *
 * @param {object} req: The package request:
 * req = {
 *   name: 'nginx-proxy.dnp.dappnode.eth',
 *   ver: '^0.1.0',
 * }
 *
 * @returns {object} dnps: Local repo of packages of interest that may be installed
 * They include the name of the package, their versions and dependencies and a tag:
 *   - isRequest
 *   - isInstalled
 * The tags are used latter to order the packages in order to
 * minimize the number of attempts to find a valid solutions
 * dnps = {
 *   'dependency.dnp.dappnode.eth': {
 *     versions: {
 *       '0.1.1': {},
 *       '0.1.2': {},
 *     },
 *   },
 *   'letsencrypt-nginx.dnp.dappnode.eth': {
 *     isInstalled: true,
 *     versions: {
 *       '0.0.4': { 'web.dnp.dappnode.eth': 'latest' },
 *     },
 *   },
 *   'nginx-proxy.dnp.dappnode.eth': {
 *     isRequest: true,
 *     versions: {
 *       '0.0.3': { 'nginx-proxy.dnp.dappnode.eth': 'latest' },
 *     },
 *   },
 *   'web.dnp.dappnode.eth': {
 *     isInstalled: true,
 *     versions: {
 *       '0.0.0': { 'letsencrypt-nginx.dnp.dappnode.eth': 'latest' },
 *     },
 *   },
 * };
 */
export default async function aggregate({
  req,
  dnpList,
  fetch
}: {
  req: PackageRequest;
  dnpList: PackageContainer[];
  fetch: DappGetFetchFunction;
}): Promise<DappGetDnps> {
  // Minimal dependency injection (fetch). Proxyquire does not support subdependencies
  const dnps: DappGetDnps = {};

  // WARNING: req is a user external input, must verify
  if (req.ver === "latest") req.ver = "*";

  await aggregateDependencies({
    name: req.name,
    versionRange: req.ver,
    dnps,
    fetch // #### Injected dependency
  });

  const relevantInstalledDnps = getRelevantInstalledDnps({
    // requestedDnps = ["A", "B", "C"]
    requestedDnps: Object.keys(dnps),
    // Ignore invalid versions as: dnp.dnp.dappnode.eth:dev, :c5ashf61
    // Ignore 'core.dnp.dappnode.eth': it's dependencies are not real and its compatibility doesn't need to be guaranteed
    installedDnps: dnpList.filter(
      dnp => semver.valid(dnp.version) && dnp.name !== "core.dnp.dappnode.eth"
    )
  });
  // Add relevant installed dnps and their dependencies to the dnps object
  await Promise.all(
    relevantInstalledDnps.map(async dnp => {
      try {
        // Fetch exact version if doesn't came from ENS. Otherwise fetch all newer versions
        await aggregateDependencies({
          name: dnp.name,
          versionRange: dnp.origin || `>=${dnp.version}`,
          dnps,
          fetch // #### Injected dependency
        });
      } catch (e) {
        logs.warn(
          `Error fetching installed dnp ${dnp.name}: ${e.stack || e.message}`
        );
      }
    })
  );

  // Label dnps. They are used to order versions
  Object.keys(dnps).forEach(dnpName => {
    const dnp = dnpList.find(dnp => dnp.name === dnpName);

    // > Label isRequest + Enfore conditions:
    //   - requested DNP versions must match the provided versionRange
    if (dnpName === req.name) {
      dnps[dnpName].isRequest = true;
      Object.keys(dnps[dnpName].versions).forEach(version => {
        if (!safeSemver.satisfies(version, req.ver)) {
          delete dnps[dnpName].versions[version];
        }
      });
      if (!Object.keys(dnps[dnpName].versions).length)
        throw Error(
          `Aggregated versions of request ${req.name}@${
            req.ver
          } did not satisfy its range`
        );
    }
    // > Label isInstalled + Enfore conditions:
    //   - installed DNPs cannot be downgraded (don't apply this condition to the request)
    else if (dnp) {
      const dnpVersion = dnp.version;
      dnps[dnpName].isInstalled = true;
      Object.keys(dnps[dnpName].versions).forEach(version => {
        if (
          // Exclusively apply this condition to semver versions.
          semver.valid(version) &&
          semver.valid(dnpVersion) &&
          // If the new version = "version" is strictly less than the current version "dnpVersion", ignore
          semver.lt(version, dnpVersion)
        )
          delete dnps[dnpName].versions[version];
      });
      if (!Object.keys(dnps[dnpName].versions).length)
        throw Error(
          `Aggregated versions of installed package ${dnpName} cause a downgrade from ${dnpVersion}. Having a future development version could be the cause of this error.`
        );
    } else {
      // Validate aggregated dnps
      // - dnps must contain at least one version of the requested package
      if (!Object.keys(dnps[dnpName].versions).length) {
        logs.error(
          `Faulty dnps object for ${req.name}@${req.ver}: ` +
            JSON.stringify(dnps, null, 2)
        );
        const reqId = `${req.name} @ ${req.ver}`;
        throw Error(
          `No version aggregated for ${dnpName} for request ${reqId}`
        );
      }
    }
  });

  return dnps;
}
