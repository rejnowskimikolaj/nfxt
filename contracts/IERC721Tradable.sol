pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

//SPDX-License-Identifier: UNLICENSED

//Interface needed by crowdsale
abstract contract IERC721Tradable is Ownable{

    function mintTo(address _to) external virtual;

    function getCurrentTokenId() external virtual view returns (uint256);
}