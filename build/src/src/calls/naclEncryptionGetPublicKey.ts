import * as db from "../db";
import { RpcHandlerReturnWithResult } from "../types";

type ReturnData = string;

/**
 * Returns the public key of nacl's asymmetric encryption,
 * to be used by the ADMIN UI to send sensitive data in a slightly
 * more protected way.
 *
 * @param {string} publicKey
 */
export default async function naclEncryptionGetPublicKey(): RpcHandlerReturnWithResult<
  ReturnData
> {
  const dappmanagerNaclPublicKey = db.naclPublicKey.get();

  return {
    message: `Got DAPPMANAGER nacl public key`,
    result: dappmanagerNaclPublicKey
  };
}
