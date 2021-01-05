pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Token.sol";

/**
 * @title Vesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period
 */

contract Vesting {
  using SafeMath for uint256;

  event tokensVested(address indexed _to, uint256 _amount, string _grantName);
  event tokensReleased(address indexed _invoker, address indexed _beneficiary, uint256 _amount);
  event grantAdded(string _grantName, uint256 _cliff, uint256 _duration);

  // The vesting schedule is time-based (i.e. using block timestamps as opposed to e.g. block numbers), and is
  // therefore sensitive to timestamp manipulation (which is something miners can do, to a certain degree). Therefore,
  // it is recommended to avoid using short time durations (less than a minute). Typical vesting schemes, with a
  // cliff period of a year and a duration of four years, are safe to use.
  // solhint-disable not-rely-on-time

  modifier onlyOwner { require(msg.sender == owner); _; }

  address private owner;
  Token private token;

  // Durations and timestamps are expressed in UNIX time, the same units as block.timestamp.
  struct Grant {
    uint256 duration;
    uint256 cliff;
  }

  mapping (address => uint256 ) private startTimes;
  mapping (address => uint256) private amounts;
  mapping (address => uint256) private releasedTokens;
  mapping (address => string ) private beneficiaryGrant;
  mapping (string => Grant) private grants;
  uint256 private unreleasedTokens;

  constructor(address tokenAddress) public {
    token = Token(tokenAddress);
    owner = msg.sender;
  }

  function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration) onlyOwner public {
    require(cliff >= 0, "TokenVesting: cliff is negative");
    require(duration >= 0, "TokenVesting: duration is negative");
    Grant memory grant = Grant({
      duration: duration,
      cliff: cliff
    });

    grants[grantName] = grant;

    emit grantAdded(grantName, cliff, duration);
  }

  function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime) onlyOwner public  {
    require(beneficiary != address(0), "TokenVesting: beneficiary is the zero address");

    Grant memory grant = grants[grantName];
    require(startTime.add(grant.duration) > block.timestamp, "TokenVesting: final time is before current time");

    unreleasedTokens = unreleasedTokens.add(amount);
    uint256 contractTokens = token.balanceOf(address(this));
    require(unreleasedTokens <= contractTokens, "TokenVesting: Total amount allocated should be less than tokens in contract");

    startTimes[beneficiary] = startTime;
    amounts[beneficiary] = amounts[beneficiary].add(amount);
    beneficiaryGrant[beneficiary] = grantName;

    emit tokensVested(beneficiary, amount, grantName);
  }

  /**
    * @return the start time of the token vesting.
    */
  function startTime(address beneficiary) public view returns (uint256) {
    return startTimes[beneficiary];
  }

  /**
    * @return the cliff time of the token vesting.
    */
  function cliff(address beneficiary) public view returns (uint256) {
    string memory grantName = beneficiaryGrant[beneficiary];
    return grants[grantName].cliff;
  }

  /**
    * @return the duration of the token vesting.
    */
  function duration(address beneficiary) public view returns (uint256) {
    string memory grantName = beneficiaryGrant[beneficiary];
    return grants[grantName].duration;
  }

  /**
    * @return the amount of the tokens alloted .
    */
  function amount(address beneficiary) public view returns (uint256) {
    return amounts[beneficiary];
  }

  /**
    * @return the amount of the token released.
    */
  function releasedAmount(address beneficiary) public view returns (uint256) {
    return releasedTokens[beneficiary];
  }

  /**
    * @notice Transfers vested tokens to beneficiary.
    */
  function release(address beneficiary) public {
    require(msg.sender == owner || msg.sender == beneficiary, "TokenVesting: Tokens can be released only by owner or beneficiary");

    uint256 unreleased = releasableAmount(beneficiary);

    require(unreleased > 0, "TokenVesting: no tokens are due");

    releasedTokens[beneficiary] = releasedTokens[beneficiary].add(unreleased);

    unreleasedTokens = unreleasedTokens.sub(unreleased);
    token.transfer(beneficiary, unreleased);

    emit tokensReleased(msg.sender, beneficiary, unreleased);
  }

  /**
    * @dev Calculates the amount that has already vested but hasn't been released yet.
    */
  function releasableAmount(address beneficiary) public view returns (uint256) {
      return vestedAmount(beneficiary).sub(releasedTokens[beneficiary]);
  }

  /**
    * @dev Calculates the amount that has already vested.
    */
  function vestedAmount(address beneficiary) public view returns (uint256) {
    uint256 totalAmount = amounts[beneficiary];
    string memory grantName = beneficiaryGrant[beneficiary];
    Grant memory grant = grants[grantName];
    uint256 start = startTimes[beneficiary];

    if (block.timestamp < start.add(grant.cliff)) {
        return 0;
    } else if (block.timestamp >= start.add(grant.cliff).add(grant.duration)) {
        return totalAmount;
    } else {
        return totalAmount.mul(block.timestamp.sub(start.add(grant.cliff))).div(grant.duration);
    }
  }

}