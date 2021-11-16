pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NftCrowdsale.sol";

//SPDX-License-Identifier: UNLICENSED
/**
 * @title CrowdsaleMaster
 * @dev Factory for mintable ERC721 crowdsales
 */
contract CrowdsaleMaster is Ownable, Pausable, ReentrancyGuard {

    //Emitted when new crowdsale is created
    event NewCrowdsale(address newCrowdsaleAddress, string projectId, uint256 maxCap, uint256 price);

    //Addresses of all the crowdsales belonging to this contract matched by their ids
    mapping(string => address) public crowdsalesByProjectIds;

    constructor() {
    }

    /**
    * @dev newCrowdsale
    * creates new crowdsale for an existing nftToken. NftToken has to have an ownership transferred to the crowdsale after deployment.
    *  @param _price - price in wei for single nft token
    *  @param _maxCap - maximum amount of nfts to be minted by the crowdsale
    *  @param _nftTokenAddress - address of the already deployed nft token. It has to follow IERC721Tradable interface
    */
    function newCrowdsale(uint256 _price, uint256 _maxCap, address _nftTokenAddress, string memory _projectId) external whenNotPaused onlyOwner returns (address){
        require(_nftTokenAddress != address(0) && _nftTokenAddress != address(this), "CrowdsaleMaster: incorrect addresses.");
        require(crowdsalesByProjectIds[_projectId] == address(0), "CrowdsaleMaster: crowdsale already exists.");
        NftCrowdsale nftCrowdsale = new NftCrowdsale(_price, _maxCap, payable(address(this)), _nftTokenAddress);
        crowdsalesByProjectIds[_projectId] = address(nftCrowdsale);
        emit NewCrowdsale(address(nftCrowdsale), _projectId, _maxCap, _price);
        return address(nftCrowdsale);
    }

    function getCrowdsaleAddressProjectId(string memory _projectId) external view returns (address){
        return crowdsalesByProjectIds[_projectId];
    }

    function withdrawTo(address payable receiver) external onlyOwner nonReentrant {
        require(receiver != address(0), "CrowdsaleMaster: incorrect address.");
        receiver.transfer(payable(address(this)).balance);
    }

    function withdrawAmountTo(address payable receiver, uint256 amount) external onlyOwner nonReentrant {
        require(receiver != address(0), "CrowdsaleMaster: incorrect address.");
        receiver.transfer(amount);
    }

    function transferCrowdsaleOwnership(string memory _projectId, address newOwner) external {
        require(newOwner != address(0), "CrowdsaleMaster: incorrect address.");
        address tokenAddress = crowdsalesByProjectIds[_projectId];
        require(tokenAddress != address(0), "CrowdsaleMaster: crowdsale doesnt exist.");
        NftCrowdsale(payable(tokenAddress)).transferOwnership(newOwner);
    }

    receive() external payable {

    }
}
