//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "./GraduateID.sol";

contract IssueCredential{
    GraduateID private graduateContract;

    struct Credential{
        string credentialName;
        string ipfsHash;
        uint256 dateIssued;
        uint256 expiryDate; // 0 means no expiry
        address issuer;
        bool isValid;
    }

    mapping(address => Credential[])public studentCredentials; // mapping the contract to student wallet address
    mapping(string => address) public studentIDtoWallet; // off-chain link between student ID to student wallet address
    mapping(address => string) public wallettoStudentID; // reverse lookup on-chain link
    mapping(string => bool) private _ipfsHashExists; // hash checker for the employers in Hiring.sol
    mapping(string => address) private _hashToStudent; // reverse lookup: hash -> student wallet
    struct CredentialRef {
        string credentialName;
        string ipfsHash;
        uint256 dateIssued;
        address issuer;
        bool isValid;
    }
    mapping(string => CredentialRef) private _hashToCredential; // quick metadata lookup by IPFS hash
    mapping(address => mapping(string => Credential[])) private _credentialsByName; // mapping address student to the student's credentials by name

    // --- Optimized querying ---
    mapping(address => uint256[]) private _credentialIndexByDate; // dates for indexed queries (future optimization)

    // Deprecated: single issuer model (replaced by admin governance via GraduateID)
    // address public issuer;

    // --- Events ---
    event studentIDLinked(address indexed wallet, string indexed studentID);
    event CredentialIssued(address indexed wallet, string indexed studentID, string credentialName, address issuer, string ipfsHash);
    event CredentialRevoked(address indexed student, uint256 credentialIndex);
    event CredentialRevokedWithReason(address indexed student, uint256 credentialIndex, string reason);
    event CredentialUpdated(address indexed student, uint256 credentialIndex, string newIpfsHash);

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(graduateContract.isUserAdmin(msg.sender), "Not admin");
        _;
    }

    constructor(address _graduateIDAddress){
        require(_graduateIDAddress != address(0), "Invalid GraduateID address");
        graduateContract = GraduateID(_graduateIDAddress);
    }

    // --- Core Functions ---

    /* Link student ID with issuer
    * @dev Allows a student to link with the issuer
    * @param _studentID, off-chain Student ID (example: 2219579)
    */
    function linkStudentID(string memory _studentID) external {
        require(studentIDtoWallet[_studentID] == address(0), "Student ID already linked");
        require(bytes(wallettoStudentID[msg.sender]).length == 0, "Wallet already linked to another student ID");

        studentIDtoWallet[_studentID] = msg.sender;
        wallettoStudentID[msg.sender] = _studentID;

        emit studentIDLinked(msg.sender, _studentID);
    }

    /* Issue credentials to a student wallet
    * @dev Allows the issuer to issue the credentials to the student's wallet
    * @param _studentWallet Address to the student's wallet address
    * @param _credentialName Name of the credential issued
    * @param _ipfsHash IPFS hash of the credential data linked to the off-chain
    */
    function issueCredential(address _studentWallet, string memory _studentID, string memory _credentialName, address _issuer, string memory _ipfsHash, uint256 _expiryDate) 
    external onlyAdmin{
        Credential memory newCredential = Credential({
            credentialName: _credentialName,
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            dateIssued: block.timestamp,
            expiryDate: _expiryDate,
            isValid: true
    });
    
        studentCredentials[_studentWallet].push(newCredential);
        _credentialsByName[_studentWallet][_credentialName].push(newCredential); // Index by name
        _ipfsHashExists[_ipfsHash] = true;
        _hashToStudent[_ipfsHash] = _studentWallet;
        _hashToCredential[_ipfsHash] = CredentialRef({
            credentialName: _credentialName,
            ipfsHash: _ipfsHash,
            dateIssued: block.timestamp,
            issuer: msg.sender,
            isValid: true
        });
        emit CredentialIssued(_studentWallet, _studentID, _credentialName, _issuer, _ipfsHash);
    }

    // --- Basic Getters ---

    /* 
    * @dev Fetch all credentials from the students
    * @param _studentWallet Student's wallet address
    */
    function getAllCredentials(address _studentWallet) 
    external view returns (Credential[] memory) {
        return studentCredentials[_studentWallet];
    }

    function getCredentialsByID(string memory _studentID) 
    external view returns (Credential[] memory) {
        address studentWallet = studentIDtoWallet[_studentID];
        require(studentWallet != address(0), "Student ID not linked to any wallet address");
        return studentCredentials[studentWallet];
    }

    /**
     * @dev Get only valid and non-expired credentials
     */
    function getValidCredentials(address _studentWallet)
    external view returns (Credential[] memory) {
        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        Credential[] memory validCreds = new Credential[](allCredentials.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (allCredentials[i].isValid && !_isExpired(allCredentials[i])) {
                validCreds[count] = allCredentials[i];
                count++;
            }
        }

        Credential[] memory result = new Credential[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = validCreds[i];
        }
        return result;
    }

    // --- Advanced Query Functions ---

    /* 
    * @dev Fetch credentials by name
    * @param _studentWallet Student's wallet address
    * @param _credentialName Name to match with the credentials
    */
    function getCredentialsbyName(address _studentWallet, string memory _credentialName)
    external view returns(Credential[] memory){
        return _credentialsByName[_studentWallet][_credentialName];
    }

    /* 
    * @dev Get credentials issued within a date range
    * @param _studentWallet Student's wallet address
    * @param _startDate Start timestamp (inclusive)
    * @param _endDate End timestamp (inclusive)
    */
    function getCredentialsbyDateRange(address _studentWallet, uint256 _startDate, uint256 _endDate)
    external view returns(Credential[] memory){
        require(_startDate <= _endDate, "Invalid date range");

        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        Credential[] memory filteredCredentials = new Credential[](allCredentials.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (allCredentials[i].dateIssued >= _startDate &&
                allCredentials[i].dateIssued <= _endDate) {
                filteredCredentials[count] = allCredentials[i];
                count++;
            }
        }

        // Resize array to actual count
        Credential[] memory result = new Credential[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = filteredCredentials[i];
        }
        return result;
    }

    /**
     * @dev Batch get credential count and sample (for pagination optimization)
     */
    function getCredentialCountAndSample(address _studentWallet)
    external view returns (uint256 totalCount, uint256 validCount, uint256 expiredCount) {
        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        totalCount = allCredentials.length;
        validCount = 0;
        expiredCount = 0;

        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (!allCredentials[i].isValid) continue;
            if (_isExpired(allCredentials[i])) {
                expiredCount++;
            } else {
                validCount++;
            }
        }
    }

    /*
     * @dev Get credentials by partial name match (case-sensitive)
     * Example: "_degree" matches "Bachelor Degree", "Master Degree"
     */
    function getCredentialsByPartialName(address _studentWallet, string memory _partialName) 
    external view returns (Credential[] memory) {
        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        Credential[] memory filteredCredentials = new Credential[](allCredentials.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allCredentials.length; i++) {
            string memory name = allCredentials[i].credentialName;
            if (
                keccak256(bytes(name)) == keccak256(bytes(_partialName)) || // Exact match
                // Check if _partialName is a substring of name (simplified check)
                keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked(_partialName, name)) ||
                keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked(name, _partialName))
            ) {
                filteredCredentials[count] = allCredentials[i];
                count++;
            }
        }

        // Return only the filtered credentials (resize array)
        Credential[] memory result = new Credential[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = filteredCredentials[i];
        }
        return result;
    }

    /* 
    * @dev Get only valid/invalid credentials
    * @param _studentWallet Student's wallet address
    * @param _isValid Filter by validity status
    */
    function getCredentialsByValidity(address _studentWallet, bool _isValid)
    external view returns(Credential[] memory){
        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        Credential[] memory filteredCredentials = new Credential[](allCredentials.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (allCredentials[i].isValid == _isValid) {
                filteredCredentials[count] = allCredentials[i];
                count++;
            }
        }

        // Resize array to actual count
        Credential[] memory result = new Credential[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = filteredCredentials[i];
        }
        return result;
    }

    /*
    * @dev Get multiple credentials from one student wallet address
    * @param _studentWallet Student's wallet address
    */
    function getMultipleCredentials(address _studentWallet, uint256 _startIndex, uint256 _batchSize)
    external view returns (Credential[] memory) {
        Credential[] memory allCredentials = studentCredentials[_studentWallet];
        uint256 endIndex = _startIndex + _batchSize;
        if (endIndex > allCredentials.length) {
            endIndex = allCredentials.length;
        }

        Credential[] memory batch = new Credential[](endIndex - _startIndex);
        for (uint256 i = _startIndex; i < endIndex; i++) {
            batch[i - _startIndex] = allCredentials[i];
        }
        return batch;
    }

    // --- Credential Management ---

    /*
     * @dev Revoke a credential by index
     */
    function revokeCredential(address _studentWallet, uint256 _index)
    external onlyAdmin {
        require(_index < studentCredentials[_studentWallet].length, "Invalid index");
        Credential storage cred = studentCredentials[_studentWallet][_index];
        cred.isValid = false;
        _ipfsHashExists[cred.ipfsHash] = false; // mark hash as invalid
        _hashToCredential[cred.ipfsHash].isValid = false;
        emit CredentialRevoked(_studentWallet, _index);
    }

    /**
     * @dev Optional: revoke with reason for richer audit trail
     */
    function revokeCredentialWithReason(address _studentWallet, uint256 _index, string memory _reason)
    external onlyAdmin {
        require(_index < studentCredentials[_studentWallet].length, "Invalid index");
        Credential storage cred = studentCredentials[_studentWallet][_index];
        cred.isValid = false;
        _ipfsHashExists[cred.ipfsHash] = false;
        _hashToCredential[cred.ipfsHash].isValid = false;
        emit CredentialRevokedWithReason(_studentWallet, _index, _reason);
    }

    /**
     * @dev Update the IPFS hash for a credential
     */
    function updateCredentialIpfsHash(address _studentWallet, uint256 _index,string memory _newIpfsHash) 
    external onlyAdmin {
        require(_index < studentCredentials[_studentWallet].length, "Invalid index");
        // clear old hash flags
        string memory oldHash = studentCredentials[_studentWallet][_index].ipfsHash;
        if (_ipfsHashExists[oldHash]) {
            _ipfsHashExists[oldHash] = false;
            _hashToCredential[oldHash].isValid = false;
        }
        // set new hash
        studentCredentials[_studentWallet][_index].ipfsHash = _newIpfsHash;
        _ipfsHashExists[_newIpfsHash] = true;
        _hashToStudent[_newIpfsHash] = _studentWallet;
        _hashToCredential[_newIpfsHash] = CredentialRef({
            credentialName: studentCredentials[_studentWallet][_index].credentialName,
            ipfsHash: _newIpfsHash,
            dateIssued: studentCredentials[_studentWallet][_index].dateIssued,
            issuer: studentCredentials[_studentWallet][_index].issuer,
            isValid: studentCredentials[_studentWallet][_index].isValid
        });
        emit CredentialUpdated(_studentWallet, _index, _newIpfsHash);
    }

    // --- Helper Functions ---

    /**
     * @dev Check if a student has any credentials
     */
    function hasCredentials(address _studentWallet) external view returns (bool) {
        return studentCredentials[_studentWallet].length > 0;
    }

    /*
     * @dev Check if a student has a specific credential by name
     */
    function hasCredential(address _studentWallet, string memory _credentialName) 
    external view returns (bool) {
        Credential[] memory credentials = studentCredentials[_studentWallet];
        for (uint256 i = 0; i < credentials.length; i++) {
            if (keccak256(bytes(credentials[i].credentialName)) == keccak256(bytes(_credentialName))) {
                return true;
            }
        }
        return false;
    }

    function isCredentialHashValid(string memory _ipfsHash) external view returns (bool) {
        return _ipfsHashExists[_ipfsHash];
    }

    /**
     * @dev Get credential metadata by IPFS hash (for HashChecker)
     */
    function getCredentialByHashFields(string memory _ipfsHash)
        external view returns (
            string memory credentialName,
            string memory ipfsHash,
            uint256 dateIssued,
            uint256 expiryDate,
            address issuer,
            bool isValid,
            address studentWallet
        )
    {
        CredentialRef memory refCred = _hashToCredential[_ipfsHash];
        return (
            refCred.credentialName,
            refCred.ipfsHash,
            refCred.dateIssued,
            0, // CredentialRef does not store expiry; only on main array
            refCred.issuer,
            refCred.isValid,
            _hashToStudent[_ipfsHash]
        );
    }

    function isCredentialExpired(address _studentWallet, uint256 _index) external view returns (bool) {
        require(_index < studentCredentials[_studentWallet].length, "Invalid index");
        return _isExpired(studentCredentials[_studentWallet][_index]);
    }

    // --- Helper Functions ---

    /**
     * @dev Internal helper to check if a credential is expired
     */
    function _isExpired(Credential memory cred) internal view returns (bool) {
        return cred.expiryDate != 0 && block.timestamp > cred.expiryDate;
    }
}