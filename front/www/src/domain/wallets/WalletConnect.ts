import { IWallet, Tx, WalletEvents } from '@/domain/wallets/IWallet'
import { ExternalProvider } from '@ethersproject/providers'
import WalletConnectProvider from '@walletconnect/web3-provider'
import { IRPCMap } from '@walletconnect/types'
import { IChain } from '@/domain/metadata/Metadata'
import { useMetadataStore } from '@/store/metadata'

export class WalletConnect implements IWallet {
    private readonly callbacks: WalletEvents
    private readonly provider: WalletConnectProvider

    constructor(callbacks: WalletEvents) {
        const rpc: IRPCMap = {}
        for (const network of useMetadataStore().getChains) {
            rpc[Number(network.id)] = network.metamask.rpcUrls[0]
        }
        this.provider = new WalletConnectProvider({
            rpc: rpc
        })
        this.callbacks = callbacks
    }

    public async isConnected() {
        return this.provider.isWalletConnect
    }

    public getConnectedAccounts(): Promise<string[]> {
        return this.provider.enable()
    }

    public async requestAccess() {
        await this.provider.enable()
    }

    public revokeAccess(): Promise<void> {
        return this.provider.disconnect()
    }

    public setListeners(): void {
        // Subscribe to accounts change
        this.provider.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                this.callbacks.onDisconnect()
            } else {
                this.callbacks.onConnect(accounts[0])
            }
        })

        // Subscribe to chainId change
        this.provider.on('chainChanged', (chainId: number) => {
            this.callbacks.onSwitchNetwork(chainId.toString())
        })

        // Subscribe to session disconnection
        this.provider.on('disconnect', (code: number, reason: string) => {
            this.callbacks.onDisconnect()
        })
    }

    public async switchNetwork(chain: IChain): Promise<boolean> {
        if (this.provider.chainId.toString() === chain.id) return true
        try {
            const hexChainId = '0x' + Number(chain.id).toString(16)
            await this.provider.connector.sendCustomRequest({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: hexChainId }]
            })
            return true
        } catch {
            return false
        }
    }

    public async getCurrentChain(): Promise<string> {
        return this.provider.chainId.toString()
    }

    public async sendTransaction(tx: Tx): Promise<string> {
        let txRequest = {
            from: tx.from,
            to: tx.to,
            data: tx.data,
            value: tx.value,
            nonce: tx.nonce,
        }

        if (Number(tx.gas) > 0) {
            txRequest = Object.assign(
                txRequest,
                {
                    gasLimit: tx.gas
                }
            )
        }
        if (Number(tx.gasPrice) > 0) {
            txRequest = Object.assign(
                txRequest,
                {
                    gasPrice: tx.gasPrice
                }
            )
        }

        const receipt = await this.provider.connector.sendTransaction(txRequest)

        return receipt.transactionHash
    }

    getProvider(): ExternalProvider {
        return this.provider
    }
}
