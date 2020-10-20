pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";

contract Token is ERC20, ERC20Detailed, ERC20Burnable, ERC20Mintable, ERC20Pausable, ERC20Capped {
    constructor(uint256 initialSupply) public ERC20Detailed("Delta Token", "DETO", 18) ERC20Capped(100*(10**6)*(10**18)) {
        _mint(msg.sender, initialSupply);
    }
}