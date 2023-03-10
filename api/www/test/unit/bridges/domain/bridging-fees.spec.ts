import { BridgingFees } from '../../../../src/bridges/domain/BridgingFees';
import { BigInteger } from '../../../../src/shared/domain/big-integer';

describe('Bridging fees', () => {
  it('should not accept negative values', () => {
    expect(() => {
      new BridgingFees(
        0,
        BigInteger.fromDecimal('0'),
        BigInteger.fromDecimal('-1'),
        18,
      );
    }).toThrowError();

    expect(() => {
      new BridgingFees(
        0,
        BigInteger.fromDecimal('-1'),
        BigInteger.fromDecimal('0'),
        18,
      );
    }).toThrowError();

    expect(() => {
      new BridgingFees(
        -1,
        BigInteger.fromDecimal('0'),
        BigInteger.fromDecimal('0'),
        18,
      );
    }).toThrowError();
  });
});
