import { Mainnet, Polygon, Fantom, BSC, Avalanche, Optimism } from './ChainIds';
import { USDC } from './TokenSymbols';
import { Token } from '../domain/Token';
import { TokenAddresses } from './TokenAddresses';

export const Tokens = {
  [USDC]: {
    [Mainnet]: new Token(USDC, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, USDC),
    [Polygon]: new Token(USDC, TokenAddresses[Polygon][USDC], 6, USDC),
    [Fantom]: new Token('USDCoin', TokenAddresses[Fantom][USDC], 6, USDC),
    [BSC]: new Token('USDCoin', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 18, USDC),
    [Avalanche]: new Token('USD Coin', '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', 6, USDC),
    [Optimism]: new Token('USD Coin', '0x7f5c764cbc14f9669b88837ca1490cca17c31607', 6, 'USDC'),
  },
};
