pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20('MYY Token', 'MTKN') {
        _mint(msg.sender, 10000);
    }
}