// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

// Import only the *interface* of IssueCredential, as we only need to call a view function.
interface IIssueCredential {
    function isCredentialHashValid(string memory _ipfsHash) external view returns (bool);
    function getCredentialByHashFields(string memory _ipfsHash)
        external view returns (
            string memory credentialName,
            string memory ipfsHash,
            uint256 dateIssued,
            address issuer,
            bool isValid,
            address studentWallet
        );
}

/**
 * @title HashChecker.sol contract
 * @dev To provide a public, gas-free way for employers to verify a hash.
 */
contract HashChecker{
    IIssueCredential private issueContract;

    constructor(address _issueCredentialAddress) {
        issueContract = IIssueCredential(_issueCredentialAddress);
    }

    /**
     * @dev Public function for employers to check hash validity
     * This is a 'view' function, so it costs no gas to call.
     */
    function verifyHash(string memory _ipfsHash) 
    external view returns (bool) {
        return issueContract.isCredentialHashValid(_ipfsHash);
    }

    /**
     * @dev Verify hash and return full credential metadata for richer UX
     */
    function verifyHashWithMetadata(string memory _ipfsHash)
        external view returns (
            string memory credentialName,
            uint256 dateIssued,
            address issuer,
            bool isValid,
            address studentWallet
        )
    {
        (
            string memory name,
            ,
            uint256 issuedAt,
            address issuerAddr,
            bool currentlyValid,
            address studentAddr
        ) = issueContract.getCredentialByHashFields(_ipfsHash);

        return (name, issuedAt, issuerAddr, currentlyValid, studentAddr);
    }

    /**
     * @dev Enhanced verification with expiry check
     */
    function verifyHashWithStatus(string memory _ipfsHash)
        external view returns (
            bool exists,
            bool isValid,
            bool isExpired,
            string memory credentialName,
            uint256 dateIssued,
            address issuer,
            address studentWallet
        )
    {
        bool valid = issueContract.isCredentialHashValid(_ipfsHash);
        (
            string memory name,
            ,
            uint256 issuedAt,
            address issuerAddr,
            bool currentlyValid,
            address studentAddr
        ) = issueContract.getCredentialByHashFields(_ipfsHash);

        // Note: expiry check not directly available in HashChecker interface
        // Frontend should handle expiry logic or extend interface
        return (valid, currentlyValid, false, name, issuedAt, issuerAddr, studentAddr);
    }
}