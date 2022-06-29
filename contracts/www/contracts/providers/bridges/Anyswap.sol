//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../../interfaces/IBridge.sol";
import "../../libraries/LibStorage.sol";

contract Anyswap is IBridge {
    function send(
        address _handler,
        address _token,
        uint256 _amount,
        uint256 _toChainId,
        bytes calldata _data
    ) external payable override returns (bool){
        LibStorage.enforceHasContractCode(_handler, "Bridge provider has no code");

        // Approve tokens for the bridge to take
        TransferHelper.safeApprove(_token, _handler, _amount);

        // Decode data to get address of custom token
        address _anyTokenAddress = abi.decode(_data, (address));

        // bytes4(keccak256(bytes('anySwapOutUnderlying(address,address,uint256,uint256)')))
        (bool success,) = _handler.call(
            abi.encodeWithSelector(0xedbdf5e2, _anyTokenAddress, address(this), _amount, _toChainId)
        );

        require(success, "Bridge: Anyswap failed");

        return true;
    }
}
