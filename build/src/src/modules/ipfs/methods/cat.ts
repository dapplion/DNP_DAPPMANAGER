import ipfs from "../ipfsSetup";
import params from "../../../params";
import { timeoutError } from "../data";
import Logs from "../../../logs";
const logs = Logs(module);

/**
 * Returns a file addressed by a valid IPFS Path.
 * @param {string} hash "QmPTkMuuL6PD8L2SwTwbcs1NPg14U8mRzerB1ZrrBrkSDD"
 * @param {object} options Available options:
 * - maxLength: specifies a length to read from the stream.
 *   if reached, it will throw an error
 * @returns {buffer} hash contents as a buffer
 */
export default function cat({
  hash,
  maxLength
}: {
  hash: string;
  maxLength?: number;
}): Promise<Buffer> {
  return new Promise(
    (resolve, reject): void => {
      // Timeout cancel mechanism
      const timeoutToCancel = setTimeout(() => {
        reject(Error(timeoutError));
      }, params.IPFS_TIMEOUT);

      const options: { length?: number } = {};
      if (maxLength) options.length = maxLength;

      ipfs.cat(hash, options, (err: Error, data: Buffer) => {
        clearTimeout(timeoutToCancel);
        if (err) return reject(err);

        if (data.length === maxLength)
          reject(Error(`Maximum size exceeded (${maxLength} bytes)`));

        // Pin files after a successful download
        ipfs.pin.add(hash, (err: Error) => {
          if (err) logs.error(`Error pinning hash ${hash}: ${err.stack}`);
        });

        resolve(data);
      });
    }
  );
}
