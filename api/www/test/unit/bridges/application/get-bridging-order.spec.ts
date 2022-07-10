import { BridgeOrderComputer } from '../../../../src/bridges/application/query/bridge-order-computer';
import { Token } from '../../../../src/shared/domain/Token';
import { HttpClient } from '../../../../src/shared/http/httpClient';
import { BridgingRequest } from '../../../../src/bridges/domain/BridgingRequest';
import { stub } from 'sinon';
import { BigInteger } from '../../../../src/shared/domain/BigInteger';

describe('get bridging step', () => {
  it('should accept upperCase token to compare', async () => {
    // Arrange
    const myHttpClient = HttpClient.create();
    stub(myHttpClient, 'get').resolves(responseUSDC());
    const bridgeOrderFetcher = new BridgeOrderComputer(myHttpClient);
    const request = new BridgingRequest(
      '137',
      '1',
      new Token('137', '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', 18),
      BigInteger.fromDecimal('1'),
    );

    // Act
    const order = await bridgeOrderFetcher.execute(request);

    // Assert
    expect(order.tokenOut.address).toEqual(
      '0x2222222222222222222222222222222222222222',
    );
  });

  it('should return error if amount is over allowed maximum', async () => {
    // Arrange
    const myHttpClient = HttpClient.create();
    stub(myHttpClient, 'get').resolves(responseUSDC('10', '1'));
    const bridgeOrderFetcher = new BridgeOrderComputer(myHttpClient);
    const request = new BridgingRequest(
      '137',
      '1',
      new Token('137', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 18),
      BigInteger.fromDecimal('20'),
    );

    // Act
    await expect(bridgeOrderFetcher.execute(request)).rejects.toThrow(
      'TOO_BIG_AMOUNT',
    );
  });

  it('should return error if amount is minor than allowed minimum', async () => {
    // Arrange
    const myHttpClient = HttpClient.create();
    stub(myHttpClient, 'get').resolves(responseUSDC('100', '10'));
    const bridgeOrderFetcher = new BridgeOrderComputer(myHttpClient);
    const request = new BridgingRequest(
      '137',
      '1',
      new Token('137', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 18),
      BigInteger.fromDecimal('5'),
    );

    // Act
    await expect(bridgeOrderFetcher.execute(request)).rejects.toThrow(
      'TOO_SMALL_AMOUNT',
    );
  });
});

function responseUSDC(maxSwap = '1', minSwap = '1') {
  return {
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      anyToken: {
        address: '0x0000000000000000000000000000000000000000',
        name: 'USDC',
        symbol: 'anyUSDC',
        decimals: 6,
      },
      underlying: {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        name: 'USDCoin(PoS)',
        symbol: 'USDC',
        decimals: 6,
      },
      destChains: {
        '1': {
          address: '0x1111111111111111111111111111111111111111',
          underlying: {
            address: '0x2222222222222222222222222222222222222222',
            name: 'USDCoin',
            symbol: 'USDC',
            decimals: 6,
          },
          swapfeeon: 1,
          liquidityType: 'INIT',
          MaximumSwap: maxSwap,
          MinimumSwap: minSwap,
          BigValueThreshold: '5000000',
          SwapFeeRatePerMillion: 0.1,
          MaximumSwapFee: '1000',
          MinimumSwapFee: '40',
          anyToken: {
            address: '0x3333333333333333333333333333333333333333',
            name: 'USDC',
            symbol: 'anyUSDC',
            decimals: 6,
          },
        },
      },
      price: 1,
      logoUrl: '',
      chainId: '137',
      tokenid: 'anyUSDC',
      version: 'STABLEV3',
      router: '0x4f3aff3a747fcade12598081e80c6605a8be192f',
      routerABI: 'anySwapOutUnderlying(anytoken,toAddress,amount,toChainID)',
    },
  };
}
