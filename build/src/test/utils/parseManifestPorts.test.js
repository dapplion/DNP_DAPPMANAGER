const expect = require("chai").expect;
const parseManifestPorts = require("utils/parseManifestPorts");

describe("Util: parseManifestPorts", function() {
  it("should parse manifest ports", () => {
    const manifest = {
      image: {
        ports: ["30303:30303/udp", "30304:30303", "8080"]
      }
    };
    const ports = parseManifestPorts(manifest);
    expect(ports).to.deep.equal([
      { portNumber: "30303", protocol: "UDP" },
      { portNumber: "30304", protocol: "TCP" }
    ]);
  });
});
