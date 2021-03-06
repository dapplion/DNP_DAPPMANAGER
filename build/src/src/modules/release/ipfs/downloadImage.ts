import * as ipfs from "../../ipfs";
import * as validate from "../../../utils/validate";
import { isAbsolute } from "path";
import { validateImage } from "../parsers/validate";
import { isIpfsHash } from "../../../utils/validate";

/**
 * Handles the download of a DNP .xz image.
 * This function handles cache and type validation, while the IPFS
 * stream and download is abstracted away.
 *
 * 1. Check if cache exist and validate it
 * 2. Cat stream to file system
 * 3. Validate downloaded image. Cache is automatically created at ${path}
 *
 * @param {string} hash "QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ"
 * @param {string} path "/usr/src/path-to-file/file.ext"
 * @param {string} options see "modules/ipfs/methods/catStreamToFs"
 */

export default async function downloadImage(
  hash: string,
  path: string,
  fileSize: number,
  progress: (n: number) => void
): Promise<void> {
  if (!isIpfsHash(hash)) throw Error(`Release must be an IPFS hash ${hash}`);

  /**
   * 0. Validate parameters
   */
  if (!path || path.startsWith("/ipfs/") || !isAbsolute("/"))
    throw Error(`Invalid path: "${path}"`);
  validate.path(path);

  /**
   * 1. Check if cache exist and validate it
   */
  const imageIsOk = await validateImage(path).then(() => true, () => false);
  if (imageIsOk) return;

  /**
   * 2. Cat stream to file system
   * - Make sure the path is correct and the parent folder exist or is created
   */
  await ipfs.catStreamToFs({ hash, path, fileSize, progress });

  /**
   * 3. Validate downloaded image
   */
  await validateImage(path).catch(e => {
    throw Error(
      `Downloaded image from ${hash} to ${path} failed validation: ${e.message}`
    );
  });
}
