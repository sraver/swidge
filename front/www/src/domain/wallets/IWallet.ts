import { ExternalProvider } from '@ethersproject/providers'
import { IChain } from '@/domain/metadata/Metadata'

export interface IWallet {
    isConnected: () => Promise<boolean>
    getConnectedAccounts: () => Promise<string[]>
    revokeAccess: () => Promise<void>
    requestAccess: () => Promise<void>
    setListeners: () => void
    switchNetwork: (chain: IChain) => Promise<boolean>
    getCurrentChain: () => Promise<string>
    sendTransaction: (tx: Tx) => Promise<TxHash>
    getProvider: () => ExternalProvider
}

export interface WalletEvents {
    onConnect: (account: string) => void
    onDisconnect: () => void
    onSwitchNetwork: (chainId: string) => void
}

export enum Wallet {
    Metamask,
    WalletConnect,
}

export interface Tx {
    from: string, // Required
    to: string, // Required (for non contract deployments)
    data: string, // Required
    value: string, // Optional
    gas: string, // Optional
    nonce: string, // Optional
    gasPrice: string, // Optional
}

export type TxHash = string
