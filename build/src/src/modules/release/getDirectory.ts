import { isEnsDomain } from "../../utils/validate";
import { DirectoryDnp, DirectoryDnpStatus } from "../../types";
import * as directoryContract from "../../contracts/directory";
import web3 from "../web3Setup";
import Logs from "../../logs";
import { notUndefined } from "../../utils/typingHelpers";
const logs = Logs(module);

// Contract parameters
const DAppNodePackageStatus: DirectoryDnpStatus[] = [
  "Deleted",
  "Active",
  "Developing"
];

/**
 * Fetches all package names in the custom dappnode directory.
 * [NOTE]: Already sorted by: feat#0, feat#1, dnp#0, dnp#1, dnp#2
 */
export default async function getDirectory(): Promise<DirectoryDnp[]> {
  const directory = new web3.eth.Contract(
    directoryContract.abi,
    directoryContract.address
  );
  const numberOfDAppNodePackages = parseInt(
    await directory.methods.numberOfDAppNodePackages().call()
  );

  // Get featured packages list
  // 0x0b00000000000000000000000000000000000000000000000000000000000000
  const featuredBytes = await directory.methods.featured().call();
  // ["0b", "00", ...]
  /**
   * 1. Strip hex prefix
   * 2. Split by substrings of 2 characters
   * 3. Remove 0 indexes
   * 4. Remove duplicate indexes
   * 5. Base64 to decimal index
   */
  const featuredIndexes: number[] = featuredBytes
    .replace("0x", "")
    .match(/.{1,2}/g)
    .filter((value: string) => value !== "00")
    .filter(
      (value: string, index: number, self: string[]) =>
        self.indexOf(value) === index
    )
    .map((base64: string) => parseInt(base64, 16));

  const directoryIds = [];
  for (let i = 0; i < numberOfDAppNodePackages; i++) {
    directoryIds.push(i);
  }

  const packages = await Promise.all(
    directoryIds.map(async i => {
      try {
        const {
          name,
          status: statusBn,
          position: positionBn
        } = await directory.methods.getPackage(i).call();

        const status = parseInt(statusBn);
        const position = parseInt(positionBn);

        // Make sure the DNP is not Deprecated or Deleted

        if (!isEnsDomain(name) || status === 0) return;

        const featuredIndex = featuredIndexes.indexOf(i);
        return {
          name,
          status,
          statusName: DAppNodePackageStatus[status],
          position,
          directoryId: i,
          isFeatured: featuredIndex > -1,
          featuredIndex: featuredIndex
        } as DirectoryDnp;
      } catch (e) {
        logs.error(`Error retrieving DNP #${i} from directory: ${e.stack}`);
      }
    })
  );

  return sortDirectoryItems(packages.filter(notUndefined));
}

/**
 * Sorts a directory with the following order
 * - featured #0
 * - featured #1
 * - normal #0
 * - normal #1
 * - normal #2
 */
export function sortDirectoryItems(dnps: DirectoryDnp[]): DirectoryDnp[] {
  const featured = dnps.filter(dnp => dnp.isFeatured);
  const notFeatured = dnps.filter(dnp => !dnp.isFeatured);
  return [
    ...featured.sort((a, b) => a.featuredIndex - b.featuredIndex),
    ...notFeatured.sort((a, b) => b.position - a.position)
  ];
}
