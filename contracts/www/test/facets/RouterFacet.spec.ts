import chai, { expect } from "chai";
import { ethers } from "hardhat";
import {
  fakeTokenContract,
  getAccounts,
  NativeToken,
  RandomAddress,
  ZeroAddress,
  zeroExEncodedCalldata,
} from "../shared";
import { Contract } from "ethers";
import { smock } from "@defi-wonderland/smock";

const Deployer = require("../../scripts/Deployer");

chai.use(smock.matchers);

describe("RouterFacet", function () {
  let providerUpdater: Contract;
  let feeManager: Contract;
  let router: Contract;
  let anyswap: Contract;
  let zeroEx: Contract;

  beforeEach(async () => {
    const { owner, relayer } = await getAccounts();
    const deployer = new Deployer(ethers, owner, relayer);
    await deployer.deploy();

    providerUpdater = await deployer.interactWith("ProviderUpdaterFacet");
    feeManager = await deployer.interactWith("FeeManagerFacet");
    router = await deployer.interactWith("RouterFacet");

    anyswap = await deployer.deployByName("Anyswap");
    zeroEx = await deployer.deployByName("ZeroEx");
  });

  describe("Swidge init process", () => {
    it("Should revert if no swap nor bridge step is required", async function () {
      /** Arrange */
      const { anyoneElse } = await getAccounts();

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          1000000,
          [0, RandomAddress, RandomAddress, "0x", false],
          [RandomAddress, 57, "0x", false],
          [RandomAddress, RandomAddress]
        );

      /** Assert */
      await expect(call).to.be.revertedWith("No required actions");
    });

    it("Should only execute swap if no bridging step is required", async function () {
      /** Arrange */
      const { owner, anyoneElse } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();
      const fakeTokenOut = await fakeTokenContract();

      // Fake response from executed methods on the output token
      fakeTokenOut.balanceOf.returnsAtCall(0, 10);
      fakeTokenOut.balanceOf.returnsAtCall(1, 20);

      const [callData] = await zeroExEncodedCalldata();

      await providerUpdater
        .connect(owner)
        .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          1000000,
          [0, fakeTokenIn.address, fakeTokenOut.address, callData, true],
          [RandomAddress, 1337, "0x", false],
          [RandomAddress, RandomAddress]
        );

      /** Assert */
      await expect(call)
        .to.emit(router, "SwapExecuted")
        .withArgs(
          fakeTokenIn.address,
          fakeTokenOut.address,
          31337,
          1000000,
          10
        );
    });

    it("Should fail if bridge handler has no code", async function () {
      /** Arrange */
      const { owner, anyoneElse } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();

      const callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [RandomAddress]
      );

      const providerSwapCode = 0;
      const providerBridgeCode = 0;

      // : Update the provider in use to have no code
      await providerUpdater
        .connect(owner)
        .updateBridge([
          providerBridgeCode,
          true,
          anyswap.address,
          "0x0c0de0c0de0c0de0c0de0c0de0c0de0c0de0c0de",
        ]);

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          1000000,
          [providerSwapCode, RandomAddress, RandomAddress, "0x", false],
          [fakeTokenIn.address, 1337, callData, true],
          [RandomAddress, RandomAddress]
        );

      /** Assert */
      await expect(call).to.be.revertedWith(
        "Bridge failed: Provider has no code"
      );
    });

    it("Should only execute bridge if no swapping step is required", async function () {
      /** Arrange */
      const { owner, anyoneElse } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();

      const callData = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [RandomAddress]
      );

      const providerSwapCode = 0;
      const providerBridgeCode = 0;

      // : deploy a provider handler compliant with the interface
      const anyswapMock = await anyswapRouterMock();

      await providerUpdater
        .connect(owner)
        .updateBridge([
          providerBridgeCode,
          true,
          anyswap.address,
          anyswapMock.address,
        ]);

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          1000000,
          [providerSwapCode, RandomAddress, RandomAddress, "0x", false],
          [fakeTokenIn.address, 1337, callData, true],
          [RandomAddress, RandomAddress]
        );

      /** Assert */
      await expect(call)
        .to.emit(router, "CrossInitiated")
        .withArgs(
          RandomAddress,
          fakeTokenIn.address,
          RandomAddress,
          RandomAddress,
          31337,
          1337,
          1000000,
          1000000
        );
    });

    it("Should execute swap and bridge when required", async function () {
      /** Arrange */
      const { owner, anyoneElse } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();
      const fakeTokenOut = await fakeTokenContract();

      // Fake response from executed methods on the output token
      fakeTokenOut.balanceOf.returnsAtCall(0, 10);
      fakeTokenOut.balanceOf.returnsAtCall(1, 20);

      const [callDataSwap] = await zeroExEncodedCalldata();

      const callDataBridge = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [RandomAddress]
      );

      const providerSwapCode = 0;
      const providerBridgeCode = 0;

      await providerUpdater
        .connect(owner)
        .updateSwapper([providerSwapCode, true, zeroEx.address, ZeroAddress]);

      const anyswapMock = await anyswapRouterMock();
      await providerUpdater
        .connect(owner)
        .updateBridge([
          providerBridgeCode,
          true,
          anyswap.address,
          anyswapMock.address,
        ]);

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          1000000,
          [
            providerSwapCode,
            fakeTokenIn.address,
            fakeTokenOut.address,
            callDataSwap,
            true,
          ],
          [fakeTokenOut.address, 1337, callDataBridge, true],
          [RandomAddress, RandomAddress]
        );

      /** Assert */
      await expect(call)
        .to.emit(router, "CrossInitiated")
        .withArgs(
          fakeTokenIn.address,
          fakeTokenOut.address,
          RandomAddress,
          RandomAddress,
          31337,
          1337,
          1000000,
          10
        );
    });

    it("Should swap successfully from native token", async function () {
      /** Arrange */
      const { owner, anyoneElse } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenOut = await fakeTokenContract();

      // Fake response from executed methods on the output token
      fakeTokenOut.balanceOf.returnsAtCall(0, 10);
      fakeTokenOut.balanceOf.returnsAtCall(1, 20);

      const [callData] = await zeroExEncodedCalldata();

      await providerUpdater
        .connect(owner)
        .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

      const amountIn = ethers.utils.parseEther("1.0");

      /** Act */
      const call = router
        .connect(anyoneElse)
        .initSwidge(
          amountIn,
          [0, NativeToken, fakeTokenOut.address, callData, true],
          [RandomAddress, 1337, "0x", false],
          [RandomAddress, RandomAddress],
          {
            value: amountIn,
          }
        );

      /** Assert */
      await expect(call)
        .to.emit(router, "SwapExecuted")
        .withArgs(
          NativeToken,
          fakeTokenOut.address,
          31337,
          "1000000000000000000",
          10
        );
    });
  });

  describe("Swidge finalize process", () => {
    it("Should fail if anyone else than relayer is the caller", async function () {
      /** Arrange */
      const { anyoneElse } = await getAccounts();

      /** Act */
      const call = router
        .connect(anyoneElse)
        .finalizeSwidge(1000000, RandomAddress, "txHash", [
          1,
          RandomAddress,
          RandomAddress,
          "0x",
          false,
        ]);

      /** Assert */
      await expect(call).to.be.revertedWith("Must be relayer");
    });

    it("Should execute the swap if relayer is the caller", async function () {
      /** Arrange */
      const { owner, relayer } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();
      const fakeTokenOut = await fakeTokenContract();

      // Fake response from executed methods on the output token
      fakeTokenOut.balanceOf.returnsAtCall(0, 10);
      fakeTokenOut.balanceOf.returnsAtCall(1, 20);

      const [callData] = await zeroExEncodedCalldata();

      await providerUpdater
        .connect(owner)
        .updateSwapper([0, true, zeroEx.address, ZeroAddress]);

      /** Act */
      const call = router
        .connect(relayer)
        .finalizeSwidge(1000000, RandomAddress, "txHash", [
          0,
          fakeTokenIn.address,
          fakeTokenOut.address,
          callData,
          true,
        ]);

      /** Assert */
      await expect(call)
        .to.emit(router, "CrossFinalized")
        .withArgs("txHash", 10);
    });

    it("Should revert if the provider fails", async function () {
      /** Arrange */
      const { relayer } = await getAccounts();

      // Create two fake ERC20 tokens
      const fakeTokenIn = await fakeTokenContract();
      const fakeTokenOut = await fakeTokenContract();

      const [callData] = await zeroExEncodedCalldata();

      /** Act */
      const call = router
        .connect(relayer)
        .finalizeSwidge(1000000, RandomAddress, "txHash", [
          0,
          fakeTokenIn.address,
          fakeTokenOut.address,
          callData,
          true,
        ]);

      /** Assert */
      await expect(call).to.be.reverted;
    });
  });

  it("Should fail if anyone else than the owner tries to retrieve", async function () {
    /** Arrange */
    const { anyoneElse } = await getAccounts();

    /** Act */
    const call = router.connect(anyoneElse).retrieve(RandomAddress, 1);

    /** Assert */
    await expect(call).to.be.reverted;
  });

  it("Should allow the owner to retrieve funds", async function () {
    /** Arrange */
    const { owner } = await getAccounts();
    const fakeToken = await fakeTokenContract();

    /** Act */
    await router.connect(owner).retrieve(fakeToken.address, 1);

    /** Assert */
    await expect(fakeToken.transfer).to.be.calledOnceWith(owner.address, 1);
  });
});

async function anyswapRouterMock(): Promise<Contract> {
  // : deploy a provider handler compliant with the interface
  const AnyswapV4RouterMock = await ethers.getContractFactory(
    "AnyswapV4RouterMock"
  );
  const anyswapMock = await AnyswapV4RouterMock.deploy();
  await anyswapMock.deployed();
  return anyswapMock;
}
