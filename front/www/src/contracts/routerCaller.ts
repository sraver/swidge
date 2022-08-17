import { ContractTransaction, ethers } from 'ethers'
import { TransactionDetails } from '@/domain/paths/path'
import IERC20Abi from './IERC20.json'

export const NATIVE_COIN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

export class RouterCaller {
    static async call(tokenIn: string, tx: TransactionDetails): Promise<ContractTransaction> {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()

        if (tokenIn !== NATIVE_COIN_ADDRESS) {
            await RouterCaller.approveIfRequired(tokenIn, tx.approvalAddress)
        }

        return await signer.sendTransaction({
            to: tx.to,
            data: tx.callData,
            value: tx.value,
            gasLimit: tx.gasLimit,
            gasPrice: tx.gasPrice,
        })
    }

    /**
     * Approves amount of tokens to be taken by spender address
     * @param tokenAddress
     * @param spender
     */
    static async approveIfRequired(tokenAddress: string, spender: string) {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()

        // Get token contract
        const Token = new ethers.Contract(
            tokenAddress,
            IERC20Abi,
            signer
        )

        const allowance = await Token.allowance(window.ethereum.selectedAddress, spender)

        if (allowance.toString() === ethers.constants.MaxUint256.toString()) {
            return
        }

        // Create the transaction
        const tx = await Token.approve(spender, ethers.constants.MaxUint256)

        // Broadcast & wait
        await tx.wait()
    }
}
