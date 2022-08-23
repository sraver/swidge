import { AggregatorRequest } from '../../../../../src/aggregators/domain/aggregator-request';
import { TokenMother } from '../../../shared/domain/token.mother';
import { BigInteger } from '../../../../../src/shared/domain/big-integer';
import { faker } from '@faker-js/faker';
import { Rango } from '../../../../../src/aggregators/domain/providers/rango';
import { QuoteRequest, QuoteResponse, RangoClient } from 'rango-sdk-basic';
import { createMock } from 'ts-auto-mock';
import { PriceFeed } from '../../../../../src/shared/domain/price-feed';
import { IPriceFeedFetcher } from '../../../../../src/shared/domain/price-feed-fetcher';

describe('aggregators', () => {
  it('should throw exception resultType is NO_ROUTE', async () => {
    // Arrange
    const client = createMock<RangoClient>({
      quote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
        return Promise.resolve({
          requestId: '',
          resultType: 'NO_ROUTE',
          route: null,
        });
      },
    });
    const priceFeedMock = createMock<IPriceFeedFetcher>();
    const rango = new Rango(client, priceFeedMock);
    const request = getAggregatorRoute();

    // Act
    const call = rango.execute(request);

    // Assert
    await expect(call).rejects.toEqual(new Error('INSUFFICIENT_LIQUIDITY'));
  });

  it('should throw exception resultType is INPUT_LIMIT_ISSUE', async () => {
    // Arrange
    const client = createMock<RangoClient>({
      quote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
        return Promise.resolve({
          requestId: '',
          resultType: 'INPUT_LIMIT_ISSUE',
          route: null,
        });
      },
    });
    const priceFeedMock = createMock<IPriceFeedFetcher>();
    const rango = new Rango(client, priceFeedMock);
    const request = getAggregatorRoute();

    // Act
    const call = rango.execute(request);

    // Assert
    await expect(call).rejects.toEqual(new Error('INSUFFICIENT_LIQUIDITY'));
  });

  it('should throw exception resultType is HIGH_IMPACT', async () => {
    // Arrange
    const client = createMock<RangoClient>({
      quote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
        return Promise.resolve({
          requestId: '',
          resultType: 'HIGH_IMPACT',
          route: null,
        });
      },
    });
    const priceFeedMock = createMock<IPriceFeedFetcher>();
    const rango = new Rango(client, priceFeedMock);
    const request = getAggregatorRoute();

    // Act
    const call = rango.execute(request);

    // Assert
    await expect(call).rejects.toEqual(new Error('INSUFFICIENT_LIQUIDITY'));
  });

  it('should return a correct Route', async () => {
    // Arrange
    const client = createMock<RangoClient>({
      quote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
        return Promise.resolve({
          requestId: '',
          resultType: 'OK',
          route: {
            outputAmount: '18123456',
            swapper: {
              id: '',
              title: '',
              logo: '',
            },
            path: [
              {
                from: {
                  blockchain: 'POLYGON',
                  address: faker.finance.ethereumAddress(),
                  symbol: 'SYM',
                  decimals: 18,
                  image: 'imgurl',
                },
                to: {
                  blockchain: 'FANTOM',
                  address: faker.finance.ethereumAddress(),
                  symbol: 'SYM',
                  decimals: 6,
                  image: 'imgurl',
                },
                swapper: {
                  id: '',
                  title: '',
                  logo: '',
                },
                swapperType: 'DEX',
                expectedOutput: '18123456',
              },
            ],
            fee: [
              {
                name: '',
                token: {
                  blockchain: 'POLYGON',
                  address: faker.finance.ethereumAddress(),
                  symbol: 'MATIC',
                  decimals: 18,
                  image: 'imgurl',
                },
                expenseType: 'FROM_SOURCE_WALLET',
                amount: '1',
              },
              {
                name: '',
                token: {
                  blockchain: 'POLYGON',
                  address: faker.finance.ethereumAddress(),
                  symbol: 'MATIC',
                  decimals: 18,
                  image: 'imgurl',
                },
                expenseType: 'FROM_SOURCE_WALLET',
                amount: '0.5',
              },
              {
                name: '',
                token: {
                  blockchain: 'FANTOM',
                  address: faker.finance.ethereumAddress(),
                  symbol: 'USDC',
                  decimals: 6,
                  image: 'imgurl',
                },
                expenseType: 'DECREASE_FROM_OUTPUT',
                amount: '200.123456',
              },
            ],
            amountRestriction: null,
            estimatedTimeInSeconds: 600,
          },
        });
      },
    });
    const priceFeedMock = createMock<IPriceFeedFetcher>({
      fetch: () => Promise.resolve(new PriceFeed(BigInteger.fromDecimal('0.5'), 18)),
    });
    const rango = new Rango(client, priceFeedMock);
    const request = getAggregatorRoute();

    // Act
    const route = await rango.execute(request);

    // Assert
    expect(route.aggregator.id).toEqual('4');
    expect(route.amountOut.toString()).toEqual('18.123456');
    expect(route.fees.nativeWei.toString()).toEqual('1500000000000000000');
    expect(route.fees.feeInUsd).toEqual('0.75');
  });
});

function getAggregatorRoute() {
  return new AggregatorRequest(
    '137',
    '250',
    TokenMother.polygonLink(),
    TokenMother.fantomUsdc(),
    BigInteger.fromDecimal('100'),
    2,
    faker.finance.ethereumAddress(),
    faker.finance.ethereumAddress(),
  );
}

/**
 it('should throw exception if request fails', async () => {
    // Arrange
    const rango = new Rango(new RangoClient('7b3d45e1-fdc1-4642-be95-3b8a8c6aebcf'));
    const request = new AggregatorRequest(
      '137',
      '250',
      TokenMother.polygonLink(),
      TokenMother.fantomUsdc(),
      BigInteger.fromDecimal('100'),
      2,
      faker.finance.ethereumAddress(),
      faker.finance.ethereumAddress(),
    );

    // Act
    const route = await rango.execute(request);
    //const route = await rango.meta();

    // Assert
  });

 */