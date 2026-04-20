// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./GraduateID.sol";

contract OnlineExam{
    GraduateID private graduateIDContract;

    enum requestStatus{Pending, Approved, Rejected}

    struct ExamRequest{
        string studentID;
        address studentAddress;
        string examID;
        requestStatus examStatus;
        uint256 reqTime;
        uint256 otpExpiry;
        bytes32 otpHash; // Store the Hash of the OTP, not the OTP itself
        bool otpUsed;
    }

    // Mapping the student address and examID to exam request (allows concurrent exams)
    mapping(address => mapping(string => ExamRequest)) public examRequests;
    // Track exam IDs per student for enumeration
    mapping(address => string[]) private _studentExamIds;
    uint256 public constant OTP_VALID_DURATION = 1 minutes; // OTP only valid for 1 minutes
    // Mapping the cooldown OTP attempts
    mapping(address => uint256) private _otpFailCooldown;
    uint256 public constant OTP_FAIL_COOLDOWN = 5 minutes; // 5-minute cooldown after 3 failed attempts

    event ExamRequestCreated(address indexed student, string examID);
    event ExamRequestApproved(address indexed examiner, address indexed student, string examID, uint256 otpExpiry);
    event StudentVerifiedForExam(address indexed student, string examID);

    modifier notInCooldown(address _studentAddress) {
    require(
            block.timestamp >= _otpFailCooldown[_studentAddress],
            "OTP attempts on cooldown. Wait 5 minutes."
        );
        _;
    }
    

    constructor(address _graduateIDAddress) {
        require(_graduateIDAddress != address(0), "Invalid GraduateID address");
        graduateIDContract = GraduateID(_graduateIDAddress);
    }

    // --- Core Functions ---

    /*
    * @dev Allows student to make request for online exam
    */
    function requestExam(string memory _studentID, string memory _examID)
    external{
        require (graduateIDContract.isUserStudent(msg.sender), "Only students can request an exam");
        require(bytes(examRequests[msg.sender][_examID].examID).length == 0, "Exam request already exists");
        examRequests[msg.sender][_examID] = ExamRequest({
            studentID: _studentID,
            studentAddress: msg.sender,
            examID: _examID,
            examStatus: requestStatus.Pending,
            reqTime: block.timestamp,
            otpExpiry: 0,
            otpHash: "",
            otpUsed: false
        });
        _addExamId(msg.sender, _examID);
        
        emit ExamRequestCreated(msg.sender, _examID);
    }

    /**
     * @dev Examiner can create an exam request on behalf of a student (useful for admin-initiated flows)
     */
    function createExamRequestForStudent(
        address _studentAddress,
        string memory _studentID,
        string memory _examID
    ) external {
        require(graduateIDContract.isUserExaminer(msg.sender), "Only Examiners can create");
        require(_studentAddress != address(0), "Invalid student address");
        require(bytes(_examID).length > 0, "Exam ID required");
        require(bytes(examRequests[_studentAddress][_examID].examID).length == 0, "Exam request already exists");

        examRequests[_studentAddress][_examID] = ExamRequest({
            studentID: _studentID,
            studentAddress: _studentAddress,
            examID: _examID,
            examStatus: requestStatus.Pending,
            reqTime: block.timestamp,
            otpExpiry: 0,
            otpHash: "",
            otpUsed: false
        });
        _addExamId(_studentAddress, _examID);

        emit ExamRequestCreated(_studentAddress, _examID);
    }

    // Internal helper to track unique exam IDs per student
    function _addExamId(address _student, string memory _examID) internal {
        string[] storage exams = _studentExamIds[_student];
        for (uint256 i = 0; i < exams.length; i++) {
            if (keccak256(bytes(exams[i])) == keccak256(bytes(_examID))) {
                return; // already tracked
            }
        }
        exams.push(_examID);
    }

    /**
     * @dev Get list of exam IDs for a student
     */
    function getStudentExamIds(address _student) external view returns (string[] memory) {
        return _studentExamIds[_student];
    }

    /**
     * @dev Get an exam request details for a student + examId
     */
    function getExamRequest(address _student, string memory _examID)
        external
        view
        returns (ExamRequest memory)
    {
        return examRequests[_student][_examID];
    }

    /**
     * @dev Examiner approves the request and sets an OTP hash[cite: 279].
     * The backend generates an OTP, hashes it, and sends it here.
     * The student receives the real OTP.
     */
    function approveRequest(address _studentAddress, string memory _examID, bytes32 _otpHash) 
    external {
        require(graduateIDContract.isUserExaminer(msg.sender), "Only Examiners can approve");
        
        ExamRequest storage request = examRequests[_studentAddress][_examID];
        require(request.examStatus == requestStatus.Pending, "No pending request");
        require(request.otpHash == bytes32(0), "OTP already assigned"); // Prevent duplicate OTP assignment

        request.examStatus = requestStatus.Approved;
        request.otpHash = _otpHash; // Examiner's backend provides this
        request.otpExpiry = block.timestamp + OTP_VALID_DURATION; // Set expiry time
        request.otpUsed = false; // Default usage OTP is unused
        
        emit ExamRequestApproved(msg.sender, _studentAddress, request.examID, request.otpExpiry);
    }

    /**
     * @dev Student enters the OTP to finalize verification.
     */

    uint256 private constant MAX_FAILED_ATTEMPTS = 3;
    mapping(address => uint256) private _failedAttempts;
    function verifyOTP(string memory _examID, string memory _otp) 
    external notInCooldown(msg.sender){
        require(graduateIDContract.isUserStudent(msg.sender), "Only Students can verify");
        
        ExamRequest storage request = examRequests[msg.sender][_examID];
        require(request.examStatus == requestStatus.Approved, "Request not approved");
        require(!request.otpUsed, "OTP already used");
        require(block.timestamp <= request.otpExpiry, "OTP expired");
        
        // Verify the provided OTP against the stored hash
        bytes32 providedOtpHash = keccak256(abi.encodePacked(_otp));
        if (request.otpHash != providedOtpHash) {
            _failedAttempts[msg.sender]++;
            if (_failedAttempts[msg.sender] >= MAX_FAILED_ATTEMPTS) {
                _otpFailCooldown[msg.sender] = block.timestamp + OTP_FAIL_COOLDOWN;
                // Invalidate OTP after too many failures
                request.otpHash = bytes32(0);
                request.examStatus = requestStatus.Rejected;
            }
            revert("Invalid OTP");
        }   

        // Mark as verified (e.g., clear the request)
        // Reset on success
        delete _failedAttempts[msg.sender];
        request.otpUsed = true;
        // Optionally retain minimal record and clear sensitive fields
        request.otpHash = bytes32(0);
        request.examStatus = requestStatus.Approved;
        // Keep entry for frontend status checks; can be purged off-chain if desired
        emit StudentVerifiedForExam(msg.sender, request.examID);
    }

    // Function to check OTP status (for frontend)
    function getOTPStatus(address _studentAddress, string memory _examID)
    external view returns (bool isValid, bool isUsed, bool isExpired){
        ExamRequest memory request = examRequests[_studentAddress][_examID];

        if (request.examStatus != requestStatus.Approved) {
            return (false, false, false);
        }

        bool expired = block.timestamp > request.otpExpiry;
        return (!expired, request.otpUsed, expired);
    }
}