pragma solidity ^0.5.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";

contract Token is ERC20, ERC20Detailed, ERC20Burnable, ERC20Mintable, ERC20Pausable, ERC20Capped {
  uint256 _startTime;
  uint256 _mintCliff;

  uint256 _tokensMintedInQuarter;
  uint256 _maxMintPerQuarter;
  uint256 _lastMintTime;

  uint256 _tokensMintedTotal;
  uint256 _tokensMintCap;

  constructor(uint256 initialSupply, uint256 startTime, uint256 mintCliff, uint256 maxMintPerQuarter, uint256 tokensMintCap) public ERC20Detailed("Delta Token", "DETO", 18) ERC20Capped(100*(10**6)*(10**18)) {
    _startTime = startTime;
    _mintCliff = mintCliff;
    _maxMintPerQuarter = maxMintPerQuarter;
    _tokensMintCap = tokensMintCap;
    _tokensMintedTotal = initialSupply;
    _mint(msg.sender, initialSupply);
  }

  function mint(address account, uint256 amount) public onlyMinter returns (bool) {
    require(block.timestamp >= _startTime.add(_mintCliff), "No minting allowed before mint cliff");
    require(_tokensMintedTotal.add(amount) <= _tokensMintCap, "Mint cap reached");

    uint256 quarterStartTime = getQuarterStartTime();
    uint256 maxMintable = getMaxMintable(quarterStartTime);
    require(amount <= maxMintable, "Limit exceeded for minting this quarter");

    if( _lastMintTime < quarterStartTime ){
        _tokensMintedInQuarter = amount;
    } else{
        _tokensMintedInQuarter = _tokensMintedInQuarter.add(amount);
    }
    _lastMintTime = block.timestamp;

    _tokensMintedTotal = _tokensMintedTotal.add(amount);
    _mint(account, amount);

    return true;
  }

  function getQuarterStartTime() public view returns (uint256){
    uint256 quarter = 0.25*(365 days);
    return _startTime + ((block.timestamp - _startTime)/(quarter))*(quarter);
  }

  function getMaxMintable(uint256 quarterStartTime) public view returns (uint256){
    if( _lastMintTime < quarterStartTime ){
        return _maxMintPerQuarter;
    } else{
        return _maxMintPerQuarter - _tokensMintedInQuarter;
    }
  }
}