import In3Client from "in3";
import Web3 from "web3";
//import params from "../params";
import Logs from "../logs";
const logs = Logs(module);

// Prevent web3 from executing to testing. Can result in infinite non-ending tests

// Web3 does not accept a string as a provider
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
//const WEB3_HOST: any = params.WEB3_HOST;

const web3 = process.env.TEST
  ? ({} as Web3)
  : new Web3(
      new In3Client({
        proof: "standard",
        signatureCount: 1,
        requestCount: 2,
        chainId: "mainnet"
      }).createWeb3Provider()
    );

if (!process.env.TEST) {
  logs.info(`Web3 connection to in3`);
  setInterval(() => {
    web3.eth.net.isListening().catch((e: Error) => {
      logs.error(`Web3 connection error to in3: ${e.message}`);
      //web3.setProvider(  );
    });
  }, 10000);
}

export default web3;
