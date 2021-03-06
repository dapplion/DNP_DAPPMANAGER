import "mocha";
import { expect } from "chai";
import * as safeSemver from "../../../src/modules/dappGet/utils/safeSemver";
import fs from "fs";
import path from "path";
import { DappGetFetchFunction } from "../../../src/modules/dappGet/types";
import { PackageContainer } from "../../../src/types";
import { mockDnp } from "../../testUtils";
import rewiremock from "rewiremock";
import Logs from "../../../src/logs";
const logs = Logs(module);
// Imports for types
import dappGetType from "../../../src/modules/dappGet";
import aggregateType from "../../../src/modules/dappGet/aggregate";

/* eslint-disable no-console */

const log = false;
function logBig(...args: string[]): void {
  const b = "=".repeat(20);
  if (log)
    logs.info(
      `\n${b}\n${args.map((s: string) => String(s)).join(`\n${b}\n`)}\n${b}'\n`
    );
}

/**
 * Purpose of the test. Make sure packages are moved to the alreadyUpgraded object
 */

describe("dappGet integration test", () => {
  /**
   * Loads all files in the ./cases folder
   * Each file describes a case with a req, dnps info and an expected result
   */
  const casesFolder = path.resolve(__dirname, "cases");
  fs.readdirSync(casesFolder)
    // Ignore README.md
    .filter(fileName => fileName.endsWith(".js"))
    .forEach(casePath => {
      const _case = require(path.resolve(casesFolder, casePath));
      describe(`Case: ${_case.name}`, () => {
        // Prepare dependencies

        const dnpList: PackageContainer[] = Object.keys(_case.dnps)
          .filter(dnpName => _case.dnps[dnpName].installed)
          .map(dnpName => {
            const dnp =
              _case.dnps[dnpName].versions[_case.dnps[dnpName].installed];
            if (!dnp) {
              throw Error(
                `The installed version must be defined: ${dnpName} @ ${
                  _case.dnps[dnpName].installed
                }`
              );
            }
            return {
              ...mockDnp,
              name: dnpName,
              version: _case.dnps[dnpName].installed,
              origin: dnp.origin,
              dependencies: dnp.dependencies || {}
            };
          });

        // Autogenerate a listContainers reponse from the _case object
        async function listContainers(): Promise<PackageContainer[]> {
          return dnpList;
        }

        const fetch: DappGetFetchFunction = {
          dependencies: async (name: string, version: string) => {
            if (!_case.dnps[name])
              throw Error(`dnp ${name} is not in the case definition`);
            if (!_case.dnps[name].versions[version])
              throw Error(
                `Version ${name} @ ${version} is not in the case definition`
              );
            return _case.dnps[name].versions[version].dependencies;
          },
          versions: async (name: string, versionRange: string) => {
            if (!_case.dnps[name])
              throw Error(`dnp ${name} is not in the case definition`);
            const allVersions = Object.keys(_case.dnps[name].versions);
            const validVersions = allVersions.filter(version =>
              safeSemver.satisfies(version, versionRange)
            );
            if (!validVersions.length)
              throw Error(
                `No version satisfied ${name} @ ${versionRange}, versions: ${allVersions.join(
                  ", "
                )}`
              );
            return validVersions;
          }
        };

        let dappGet: typeof dappGetType;
        let aggregate: typeof aggregateType;

        before("Mock", async () => {
          const dappGetImport = await rewiremock.around(
            () => import("../../../src/modules/dappGet"),
            mock => {
              mock(() => import("../../../src/modules/dappGet/fetch"))
                .with(fetch)
                .toBeUsed();
              mock(() => import("../../../src/modules/docker/listContainers"))
                .with({ listContainers })
                .toBeUsed();
            }
          );
          const aggregateImport = await rewiremock.around(
            () => import("../../../src/modules/dappGet/aggregate"),
            mock => {
              mock(() => import("../../../src/modules/docker/listContainers"))
                .with({ listContainers })
                .toBeUsed();
            }
          );
          dappGet = dappGetImport.default;
          aggregate = aggregateImport.default;
        });

        it("Agreggate dnps for the integration test", async () => {
          const dnps = await aggregate({ req: _case.req, dnpList, fetch });
          logBig("  Aggregated DNPs", JSON.stringify(dnps, null, 2));
          expect(Boolean(Object.keys(dnps).length)).to.equal(
            true,
            "Make sure the aggregation is not empty"
          );
          expect(Boolean(dnps[_case.req.name])).to.equal(
            true,
            "Make sure the aggregation includes the requested package"
          );
          if (_case.expectedAggregate) {
            expect(dnps).to.deep.equal(_case.expectedAggregate);
          }
        });

        it("Should return the expect result", async () => {
          const result = await dappGet(_case.req);
          const { state, alreadyUpdated } = result;
          logBig("  DNPs result", JSON.stringify(result, null, 2));

          expect(Boolean(Object.keys(state).length)).to.equal(
            true,
            `Make sure the success object is not empty: ${JSON.stringify(
              result,
              null,
              2
            )}`
          );
          expect(Boolean(state[_case.req.name])).to.equal(
            true,
            "Make sure the success object includes the requested package"
          );
          expect(state).to.deep.equal(_case.expectedState);

          if (_case.alreadyUpdated) {
            expect(alreadyUpdated).to.deep.equal(_case.alreadyUpdated);
          }
        });
      });
    });
});
