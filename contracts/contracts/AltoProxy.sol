// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title AltoProxy
/// @notice Minimal owner-gated proxy that delegatecalls into AltoRouter.
/// @dev The proxy OWNS the trove and the Stability Pool deposit. All
///      AltoRouter logic runs in this proxy's storage context via
///      delegatecall, so Mezo sees msg.sender == this proxy.
contract AltoProxy {
    address public immutable router;
    address public owner;

    constructor(address _router, address _owner) {
        router = _router;
        owner = _owner;
    }

    /// @notice Accept plain BTC transfers so the proxy can be funded directly.
    receive() external payable {}

    /// @notice Forward any call to the router via delegatecall. Owner only.
    /// @dev msg.value is preserved through delegatecall, so payable router
    ///      functions (e.g. openTrove) receive collateral sent with this call.
    fallback() external payable {
        require(msg.sender == owner, "AltoProxy: not owner");
        address target = router;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
