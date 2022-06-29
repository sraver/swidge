//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../libraries/LibProvider.sol";
import "../../libraries/LibBytes.sol";
import "../../interfaces/IDEX.sol";

contract ZeroEx is IDEX {
    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        bytes calldata _data
    ) external payable override returns (uint256) {
        // Extract the contract address and callData
        (address payable callAddress) = abi.decode(_data, (address));

        LibStorage.enforceHasContractCode(callAddress, "Swap provider has no code");

        // Remove first 32 bytes(address)
        // to have the correct callData for provider
        bytes memory callData = LibBytes.slice(_data, 32, _data.length - 32);

        uint256 valueToSend;
        // Check how much value we need to forward
        if (_tokenIn == LibProvider.nativeToken()) {
            valueToSend = _amountIn;
        }
        else {
            valueToSend = 0;
            // Approve tokens to the provider contract
            TransferHelper.safeApprove(_tokenIn, callAddress, _amountIn);
        }

        bool isNativeOut = _tokenOut == LibProvider.nativeToken();
        // Depending if its native coin OR token,
        // we compute the boughtAmount different
        uint256 boughtAmount;
        if (isNativeOut) {
            boughtAmount = address(this).balance;
        }
        else {
            boughtAmount = IERC20(_tokenOut).balanceOf(address(this));
        }

        // Execute swap with ZeroEx and compute final `boughtAmount`
        (bool success,) = callAddress.call{value : valueToSend}(callData);
        require(success, "Swap: ZeroEx failed");

        if (isNativeOut) {
            boughtAmount = address(this).balance - boughtAmount;
        }
        else {
            boughtAmount = IERC20(_tokenOut).balanceOf(address(this)) - boughtAmount;
        }

        return boughtAmount;
    }
}
