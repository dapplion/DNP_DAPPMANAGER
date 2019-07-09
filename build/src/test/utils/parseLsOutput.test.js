const expect = require("chai").expect;
const parseLsOutput = require("utils/parseLsOutput");

/* eslint-disable max-len */

describe("Util: parseLsOutput", () => {
  // Raw output straight from utils/shell
  const output =
    "total 56\n-rwxr-xr-x    2 root     root          2745 May  9 20:49 Eth config.json\ndrwxr-xr-x    5 root     root           340 May 21 21:35 dev\ndrwxr-xr-x    1 root     root          4096 May 21 21:35 etc\ndrwxr-xr-x    2 root     root          4096 May  9 20:49 home\ndrwxr-xr-x    1 root     root          4096 May  9 20:49 usr\ndrwxr-xr-x    1 root     root          4096 May  9 20:49 var";

  it("should parse dockerSystemDf output", () => {
    const res = parseLsOutput(output);
    expect(res).to.deep.equal([
      {
        isDirectory: false,
        permissions: "-rwxr-xr-x",
        numOfLinks: "2",
        ownerName: "root",
        ownerGroup: "root",
        size: "2745",
        month: "May",
        day: "9",
        time: "20:49",
        name: "Eth config.json"
      },
      {
        isDirectory: true,
        permissions: "drwxr-xr-x",
        numOfLinks: "5",
        ownerName: "root",
        ownerGroup: "root",
        size: "340",
        month: "May",
        day: "21",
        time: "21:35",
        name: "dev"
      },
      {
        isDirectory: true,
        permissions: "drwxr-xr-x",
        numOfLinks: "1",
        ownerName: "root",
        ownerGroup: "root",
        size: "4096",
        month: "May",
        day: "21",
        time: "21:35",
        name: "etc"
      },
      {
        isDirectory: true,
        permissions: "drwxr-xr-x",
        numOfLinks: "2",
        ownerName: "root",
        ownerGroup: "root",
        size: "4096",
        month: "May",
        day: "9",
        time: "20:49",
        name: "home"
      },
      {
        isDirectory: true,
        permissions: "drwxr-xr-x",
        numOfLinks: "1",
        ownerName: "root",
        ownerGroup: "root",
        size: "4096",
        month: "May",
        day: "9",
        time: "20:49",
        name: "usr"
      },
      {
        isDirectory: true,
        permissions: "drwxr-xr-x",
        numOfLinks: "1",
        ownerName: "root",
        ownerGroup: "root",
        size: "4096",
        month: "May",
        day: "9",
        time: "20:49",
        name: "var"
      }
    ]);
  });
});
