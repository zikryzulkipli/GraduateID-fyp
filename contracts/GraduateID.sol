// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GraduateID is Ownable{
    constructor() Ownable(msg.sender) {}  // <-- Fix: Pass msg.sender to Ownable
    
    enum Role{None, Student, Examiner, Admin, Staff}
    
    struct Graduate{
        string ID;
        string name;
        Role role;
        address wallet;
        bool isVerified;
    }

    // Examiner -> course code/name mapping
    mapping(address => string) private examinerCourse;

    event ExaminerCourseUpdated(address indexed examiner, string course);

    mapping(address => Graduate) public graduates;

    // --- Admin Governance (Owner-managed bootstrap) ---
    mapping(address => bool) private _admins;
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    // --- Events ---

    // Check if the address is registered
    event AddressRegistered(address indexed wallet, string ID, string name, Role role);
    event GraduateVerified(address indexed graduateAddress);

    // Add admin (owner-managed bootstrap)
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid address");
        require(!_admins[_admin], "Already admin");
        _admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    // Remove admin (owner-managed bootstrap)
    function removeAdmin(address _admin) external onlyOwner {
        require(_admins[_admin], "Not admin");
        _admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    // Check admin status
    function isUserAdmin(address _address) external view returns (bool) {
        return _admins[_address];
    }

    // Get all admins (for audit/UX)
    function getAdmins(address[] memory candidates) external view returns (bool[] memory) {
        bool[] memory results = new bool[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            results[i] = _admins[candidates[i]];
        }
        return results;
    }

    // Transfer ownership to new owner (rotates admin authority)
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Invalid address");
        require(newOwner != owner(), "Same owner");
        _transferOwnership(newOwner);
    }

    function registerID(address _graduateAddress, string memory _ID, string memory _name, Role _role)
    public onlyOwner{
        require(bytes(_ID).length > 0, "ID cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");

        // Check if already registered
        require(graduates[_graduateAddress].wallet == address(0), "Address already registered");

        graduates[_graduateAddress] = Graduate({
            ID: _ID,
            name: _name,
            role: _role,
            wallet: _graduateAddress,
            isVerified: false
        });

        emit AddressRegistered(_graduateAddress, _ID, _name, _role);
    }

    /**
     * @dev Register an examiner with course metadata (single call convenience)
     */
    function registerExaminer(
        address _graduateAddress,
        string memory _ID,
        string memory _course
    ) public onlyOwner {
        require(bytes(_course).length > 0, "Course is required");
        registerID(_graduateAddress, _ID, _course, Role.Examiner);
        examinerCourse[_graduateAddress] = _course;
        emit ExaminerCourseUpdated(_graduateAddress, _course);
    }

    /**
     * @dev Update an examiner's course (admin-only)
     */
    function updateExaminerCourse(address _examiner, string memory _course) public onlyOwner {
        require(_examiner != address(0), "Invalid address");
        require(graduates[_examiner].role == Role.Examiner, "Not an examiner");
        require(bytes(_course).length > 0, "Course is required");
        examinerCourse[_examiner] = _course;
        emit ExaminerCourseUpdated(_examiner, _course);
    }

    /**
     * @dev Get course for examiner
     */
    function getExaminerCourse(address _examiner) external view returns (string memory) {
        return examinerCourse[_examiner];
    }

    function verifyGraduate(address _graduateAddress) public onlyOwner{
        require(_graduateAddress != address(0), "Invalid address");
        require(graduates[_graduateAddress].wallet != address(0), "Address not registered");

        graduates[_graduateAddress].isVerified = true;
        emit GraduateVerified(_graduateAddress);
    }

    /*
    * @dev Check if the address is student or not
    * Linked with OnlineExam.sol
    */
    function isUserStudent(address _graduateAddress) external view returns (bool) {
        require(_graduateAddress != address(0), "Invalid address");
        return graduates[_graduateAddress].role == Role.Student;
    }

    /*
    * @dev Check if the address is examiner or not
    * Linked with OnlineExam.sol
    */
    function isUserExaminer(address _graduateAddress) external view returns (bool) {
        require(_graduateAddress != address(0), "Invalid address");
        return graduates[_graduateAddress].role == Role.Examiner;
    }

    /*
    * @dev Get the role of a user
    * Returns the uint8 representation of the role enum
    * 0=None, 1=Student, 2=Examiner, 3=Admin, 4=Staff
    */
    function getUserRole(address _graduateAddress) external view returns (uint8) {
        require(_graduateAddress != address(0), "Invalid address");
        return uint8(graduates[_graduateAddress].role);
    }

    function getGraduate(address _graduateAddress)
        public view returns(string memory, string memory, Role, address payable, bool){
            Graduate memory g = graduates[_graduateAddress];
            return(
                g.ID,
                g.name,
                g.role,
                payable(g.wallet),
                g.isVerified
            );
        }
}