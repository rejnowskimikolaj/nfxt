pragma solidity ^0.8.0;

import "./ERC721Tradable.sol";

/**
 * @title NFTicket
 * NftToken - a contract for NFT tickets
 SPDX-License-Identifier: UNLICENSED
 */
contract NftToken is ERC721Tradable {

    constructor(address _proxyRegistryAddress, string memory _name, string memory _symbol, string memory _baseTokenURI)
        ERC721Tradable(_name, _symbol, _proxyRegistryAddress)
    {
        baseTokenURI = _baseTokenURI;
    }

    function contractURI() public pure returns (string memory) {
        return "";
    }
}