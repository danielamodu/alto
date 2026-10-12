// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "./AltoProxy.sol";

interface IBorrowerOperations {
    function openTrove(
        uint256 _maxFeePercentage,
        uint256 _MUSDAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function adjustTrove(
        uint256 _collWithdrawal,
        uint256 _MUSDChange,
        bool _isDebtIncrease,
        address _upperHint,
        address _lowerHint
    ) external payable;
}

interface IStabilityPool {
    function provideToSP(uint256 _amount) external;

    function withdrawFromSP(uint256 _amount) external;

    function getCompoundedMUSDDeposit(
        address _depositor
    ) external view returns (uint256);
}

interface IMUSD {
    function approve(
        address spender,
        uint256 amount
    ) external returns (bool);

    function transfer(
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(
        address account
    ) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}

/// @title AltoRouter
/// @notice One-click MUSD looping on Mezo via user-owned proxies.
/// @dev ARCHITECTURE: BorrowerOperations acts on the CALLER's trove, so this
///      contract can never borrow on behalf of a user's EOA. Instead each
///      user gets their own AltoProxy (deployed via createAccount). Logic
///      below runs via delegatecall in the proxy's context, so the proxy
///      owns the trove and the Stability Pool deposit. Existing EOA-owned
///      troves cannot be looped through this router — users open fresh
///      proxy-owned troves via openTrove, then loop them.
contract AltoRouter {
    /// @dev 0.5% max borrowing fee (1e18 == 100%).
    uint256 public constant MAX_FEE_PERCENTAGE = 5e15;

    address public immutable borrowerOperations;
    address public immutable stabilityPool;
    address public immutable musdToken;

    /// @dev Address this logic contract was deployed at. Used to enforce
    ///      that logic functions only run via delegatecall from a proxy.
    ///      Immutables resolve to the router's values under delegatecall.
    address private immutable self;

    event AccountCreated(address indexed owner, address indexed proxy);
    event TroveOpened(address indexed proxy, uint256 musdAmount);
    event Looped(address indexed proxy, uint256 additionalDebt);
    event WithdrawnFromSP(address indexed proxy, uint256 amount);

    constructor(
        address _borrowerOperations,
        address _stabilityPool,
        address _musdToken
    ) {
        borrowerOperations = _borrowerOperations;
        stabilityPool = _stabilityPool;
        musdToken = _musdToken;
        self = address(this);
    }

    /// @dev Logic functions must run in a proxy's context, never directly.
    modifier onlyDelegate() {
        require(address(this) != self, "AltoRouter: call via proxy");
        _;
    }

    /// @notice Deploy a personal AltoProxy for the caller.
    /// @dev Must be called directly on the router, not via delegatecall.
    /// @return proxy Address of the newly deployed proxy.
    function createAccount() external returns (address proxy) {
        require(address(this) == self, "AltoRouter: call directly");
        AltoProxy account = new AltoProxy(address(this), msg.sender);
        emit AccountCreated(msg.sender, address(account));
        return address(account);
    }

    /// @notice Open a trove owned by the calling proxy.
    /// @dev Call via proxy with BTC attached as collateral.
    function openTrove(
        uint256 musdAmount,
        address upperHint,
        address lowerHint
    ) external payable onlyDelegate {
        IBorrowerOperations(borrowerOperations).openTrove{value: msg.value}(
            MAX_FEE_PERCENTAGE,
            musdAmount,
            upperHint,
            lowerHint
        );
        emit TroveOpened(address(this), musdAmount);
    }

    /// @notice Borrow more MUSD against the proxy's trove and deposit it
    ///         into the Stability Pool in one call.
    /// @dev Call via proxy. No collateral moves (collWithdrawal = 0).
    ///      The freshly minted MUSD lands in the proxy, which approves the
    ///      Stability Pool and deposits the full additionalDebt.
    function loop(
        uint256 additionalDebt,
        address upperHint,
        address lowerHint
    ) external onlyDelegate {
        IBorrowerOperations(borrowerOperations).adjustTrove(
            0,
            additionalDebt,
            true,
            upperHint,
            lowerHint
        );

        require(
            IMUSD(musdToken).approve(stabilityPool, additionalDebt),
            "AltoRouter: SP approve failed"
        );
        IStabilityPool(stabilityPool).provideToSP(additionalDebt);

        emit Looped(address(this), additionalDebt);
    }

    /// @notice Withdraw MUSD from the proxy's Stability Pool deposit.
    /// @dev MUSD lands in the proxy; pull it out with withdrawMUSD.
    function withdrawFromSP(uint256 amount) external onlyDelegate {
        IStabilityPool(stabilityPool).withdrawFromSP(amount);
        emit WithdrawnFromSP(address(this), amount);
    }

    /// @notice Send the proxy's MUSD balance to its owner. Owner only.
    function withdrawMUSD(uint256 amount) external onlyDelegate {
        address owner = AltoProxy(payable(address(this))).owner();
        require(msg.sender == owner, "AltoRouter: not proxy owner");
        require(
            IMUSD(musdToken).transfer(owner, amount),
            "AltoRouter: transfer failed"
        );
    }
}
