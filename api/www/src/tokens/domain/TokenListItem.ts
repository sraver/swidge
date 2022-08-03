import { ContractAddress } from '../../shared/types';

export class TokenListItem {
  constructor(
    private readonly _chainId: string,
    private readonly _address: ContractAddress,
    private readonly _name: string,
    private readonly _decimals: number,
    private readonly _symbol: string,
    private readonly _logoURL: string,
  ) {}

  get chainId(): string {
    return this._chainId;
  }

  get address(): ContractAddress {
    return this._address;
  }

  get name(): string {
    return this._name;
  }

  get decimals(): number {
    return this._decimals;
  }

  get symbol(): string {
    return this._symbol;
  }

  get logoURL(): string {
    return this._logoURL;
  }
}