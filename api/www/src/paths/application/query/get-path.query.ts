import { ContractAddress } from '../../../shared/types';

export class GetPathQuery {
  constructor(
    private readonly _fromChainId: string,
    private readonly _toChainId: string,
    private readonly _srcToken: ContractAddress,
    private readonly _dstToken: ContractAddress,
    private readonly _amountIn: string,
  ) {}

  get fromChainId(): string {
    return this._fromChainId;
  }

  get toChainId(): string {
    return this._toChainId;
  }

  get srcToken(): ContractAddress {
    return this._srcToken;
  }

  get dstToken(): ContractAddress {
    return this._dstToken;
  }

  get amountIn(): string {
    return this._amountIn;
  }

  get isMonoChain(): boolean {
    return this._fromChainId === this._toChainId;
  }
}