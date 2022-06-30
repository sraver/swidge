// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IBridge.sol";
import "../interfaces/IDEX.sol";
import "./LibStorage.sol";
import "./LibBytes.sol";

library LibProvider {

    function getBridge(uint8 _code) internal view returns (LibStorage.Provider storage) {
        return LibStorage.providers().bridgeProviders[_code];
    }

    function getSwapper(uint8 _code) internal view returns (LibStorage.Provider storage) {
        return LibStorage.providers().swapProviders[_code];
    }

    function nativeToken() internal pure returns (address) {
        return address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    }

    function bridge(
        uint8 _code,
        address _token,
        uint256 _amount,
        uint256 _toChainId,
        bytes memory _data
    ) internal {
        LibStorage.Provider memory _bridge = getBridge(_code);

        if (!_bridge.enabled) {
            revert("Bridge not enabled");
        }

        (bool success,bytes memory data) = _bridge.implementation.delegatecall(
            abi.encodeWithSelector(
                IBridge.send.selector,
                _bridge.handler, _token, _amount, _toChainId, _data
            )
        );

        if (!success) {
            string memory _revertMsg = _getRevertMsg(data);
            revert(string(abi.encodePacked("Bridge failed: ", _revertMsg)));
        }
    }

    function swap(
        uint8 _code,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        bytes memory _data
    ) internal returns (uint256) {
        LibStorage.Provider memory _swapper = getSwapper(_code);

        if (!_swapper.enabled) {
            revert("Swapper not enabled");
        }

        (bool success, bytes memory data) = _swapper.implementation.delegatecall(
            abi.encodeWithSelector(
                IDEX.swap.selector,
                _tokenIn, _tokenOut, _amountIn, _data
            )
        );

        if (!success) {
            string memory _revertMsg = _getRevertMsg(data);
            revert(string(abi.encodePacked("Swap failed: ", _revertMsg)));
        }

        (uint256 boughtAmount) = abi.decode(data, (uint256));

        return boughtAmount;
    }

    /// @dev Get the revert message from a call
    /// @notice This is needed in order to get the human-readable revert message from a call
    /// @param _res Response of the call
    /// @return Revert message string
    function _getRevertMsg(bytes memory _res) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently
        if (_res.length < 68) return 'Reverted silently';
        // Remove the selector which is the first 4 bytes
        bytes memory revertData = LibBytes.slice(_res, 4, _res.length - 4);
        // All that remains is the revert string
        return abi.decode(revertData, (string));
    }
}