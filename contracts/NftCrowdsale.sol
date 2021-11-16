pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
//import "./NftToken.sol";
import "./IERC721Tradable.sol";

//SPDX-License-Identifier: UNLICENSED

/**
 * @title NftCrowdsale
 * @dev Crowdsale for mintable and tradable ERC721 token.
 */
contract NftCrowdsale is Ownable, Pausable, ReentrancyGuard {
    //Emitted when received transfer is forwarded to the wallet
    event Sent(address indexed payee, uint256 amount);
    //Emitted when token purchased
    event Received(address indexed payer, uint tokenId, uint256 amount, uint256 balance);

    //Address of deployed token contract
    IERC721Tradable public nftTokenAddress;

    //Price of single token in wei
    uint256 public currentPrice;
    //Max amount of token to be minted
    uint256 public maxCap;
    // Address where funds are collected
    address payable private wallet;

    /**
   *  Crowdsale constructor
   *  @param _currentPrice - price in wei for single nft token
   *  @param _maxCap - maximum amount of nfts to be minted
   *  @param _wallet - address of the wallet, where the funds should be forwarded after token purchase
   *  @param _nftAddress - address of the already deployed nft token. It has to follow IERC721Tradable interface
   */
    constructor( uint256 _currentPrice, uint256 _maxCap, address payable _wallet, address _nftAddress) {
        require(_currentPrice > 0, "NftCrowdsale: price is less than 1.");
        require(_maxCap > 0, "NftCrowdsale: maxCap is less than 1.");
        require(_wallet != address(0), "NftCrowdsale: wallet is the zero address.");
        require(_wallet != address(0), "NftCrowdsale: nftAddress is the zero address.");
        nftTokenAddress =  IERC721Tradable(_nftAddress);
        currentPrice = _currentPrice;
        maxCap = _maxCap;
        wallet = _wallet;
    }

    /**
    * @dev Purchase
    * mints a new token for the person calling this method (or transferring funds)
    *
    */
    function purchaseToken() public payable whenNotPaused nonReentrant {
        require(msg.sender != address(0) && msg.sender != address(this));
        require(msg.value >= currentPrice, "NftCrowdsale: value to small.");
        uint256 currentTokenId = nftTokenAddress.getCurrentTokenId();
        require(currentTokenId < maxCap, "NftCrowdsale: max cap reached.");
        nftTokenAddress.mintTo(msg.sender);
        _forwardFunds();
        emit Received(msg.sender, currentTokenId + 1, msg.value, address(this).balance);
    }

    /**
       *the address where funds are collected.
       */
    function getWallet() public view returns (address payable) {
        return wallet;
    }

    /**
       *  changes the address where funds are collected.
       */
    function setWallet(address payable _newWallet) public onlyOwner nonReentrant{
        wallet = _newWallet;
    }

    function _forwardFunds() internal {
        wallet.transfer(msg.value);
        emit Sent(wallet, msg.value);
    }

    receive() external payable {
    purchaseToken();
    }
}