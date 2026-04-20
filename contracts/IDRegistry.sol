// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

/**
 * @title IDRegistry
 * @dev Server-side (on-chain) ID generation and registration for students/staff.
 * Prevents client-side ID manipulation by storing ID assignment on-chain.
 */
contract IDRegistry {
    // ID prefix types
    enum IDType { Student, Staff, Examiner }

    struct IDAssignment {
        string uniqueID;
        IDType idType;
        uint256 issuedAt;
        bool isActive;
        string metadata; // JSON or name field
    }

    // Wallet address -> ID assignment
    mapping(address => IDAssignment) public idAssignments;
    
    // ID -> Wallet (prevent duplicate IDs)
    mapping(string => address) public idToWallet;

    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    event IDAssigned(address indexed wallet, string uniqueID, uint8 idType);
    event IDRevoked(address indexed wallet, string uniqueID);
    event IDMetadataUpdated(address indexed wallet, string newMetadata);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Server assigns a unique ID to a wallet (prevents client-side manipulation)
     */
    function assignID(address _wallet, string memory _uniqueID, IDType _idType, string memory _metadata)
        external onlyOwner
    {
        require(_wallet != address(0), "Invalid wallet");
        require(bytes(_uniqueID).length > 0, "Empty ID");
        require(idToWallet[_uniqueID] == address(0), "ID already assigned");

        // If wallet already has an ID, revoke it first
        if (bytes(idAssignments[_wallet].uniqueID).length > 0) {
            string memory oldID = idAssignments[_wallet].uniqueID;
            delete idToWallet[oldID];
        }

        idAssignments[_wallet] = IDAssignment({
            uniqueID: _uniqueID,
            idType: _idType,
            issuedAt: block.timestamp,
            isActive: true,
            metadata: _metadata
        });

        idToWallet[_uniqueID] = _wallet;
        emit IDAssigned(_wallet, _uniqueID, uint8(_idType));
    }

    /**
     * @dev Revoke an ID
     */
    function revokeID(address _wallet) external onlyOwner {
        require(idAssignments[_wallet].isActive, "ID not active");
        string memory id = idAssignments[_wallet].uniqueID;
        idAssignments[_wallet].isActive = false;
        delete idToWallet[id];
        emit IDRevoked(_wallet, id);
    }

    /**
     * @dev Update metadata (e.g., name)
     */
    function updateMetadata(address _wallet, string memory _newMetadata) external onlyOwner {
        require(idAssignments[_wallet].isActive, "ID not active");
        idAssignments[_wallet].metadata = _newMetadata;
        emit IDMetadataUpdated(_wallet, _newMetadata);
    }

    /**
     * @dev Get ID by wallet
     */
    function getID(address _wallet) external view returns (string memory, uint8, uint256, bool, string memory) {
        IDAssignment memory assignment = idAssignments[_wallet];
        return (
            assignment.uniqueID,
            uint8(assignment.idType),
            assignment.issuedAt,
            assignment.isActive,
            assignment.metadata
        );
    }

    /**
     * @dev Get wallet by ID
     */
    function getWallet(string memory _uniqueID) external view returns (address) {
        return idToWallet[_uniqueID];
    }

    /**
     * @dev Check if ID is registered and active
     */
    function isIDActive(string memory _uniqueID) external view returns (bool) {
        address wallet = idToWallet[_uniqueID];
        return wallet != address(0) && idAssignments[wallet].isActive;
    }

    // Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
