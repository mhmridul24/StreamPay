// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StreamPay {

    address public admin;
    uint256 public adminFees;
    uint256 public nextStreamId;

    struct Stream {
        uint256 id;
        uint256 companyId;
        address employer;
        address employee;
        uint256 totalDeposit;
        uint256 startTime;
        uint256 duration;
        uint256 totalWithdrawn;
        bool active;
    }

    mapping(uint256 => Stream) public streams;
    mapping(uint256 => address) public companyOwners;
    mapping(uint256 => mapping(address => bool)) public companyEmployees;


    // =====================================================
    // EVENTS
    // =====================================================

    event StreamCreated(
        uint256 indexed streamId,
        uint256 indexed companyId,
        address indexed employer,
        address employee,
        uint256 amount,
        uint256 duration
    );

    event Withdrawn(
        uint256 indexed streamId,
        address indexed employee,
        uint256 grossAmount,
        uint256 fee,
        uint256 employeeAmount
    );

    event StreamCancelled(
        uint256 indexed streamId,
        uint256 employeeVestedAmount,
        uint256 employerRefund
    );

    event AdminFeesClaimed(
        address indexed admin,
        uint256 amount
    );


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {
        admin = msg.sender;
    }


    // =====================================================
    // COMPANY REGISTRATION
    // =====================================================

    function registerCompany(
        uint256 _companyId
    )
        external
    {
        require(
            _companyId > 0,
            "Invalid company ID"
        );

        require(
            companyOwners[_companyId] == address(0),
            "Company already registered"
        );

        companyOwners[_companyId] = msg.sender;
    }


    // =====================================================
    // EMPLOYEE REGISTRATION
    // =====================================================

    function registerEmployee(
        uint256 _companyId,
        address _employee
    )
        external
    {
        require(
            companyOwners[_companyId] == msg.sender,
            "Not company owner"
        );

        require(
            _employee != address(0),
            "Invalid employee address"
        );

        companyEmployees[_companyId][_employee] = true;
    }


    // =====================================================
    // CREATE STREAM
    // =====================================================

    function createStream(
        uint256 _companyId,
        address _employee,
        uint256 _duration
    )
        external
        payable
        returns (uint256)
    {
        require(
            msg.value > 0,
            "Deposit must be greater than zero"
        );

        require(
            _duration > 15,
            "Duration must be greater than 15 seconds"
        );

        require(
            companyOwners[_companyId] == msg.sender,
            "Not company owner"
        );

        require(
            companyEmployees[_companyId][_employee],
            "Employee not registered"
        );

        uint256 streamId = nextStreamId;

        streams[streamId] = Stream({
            id: streamId,
            companyId: _companyId,
            employer: msg.sender,
            employee: _employee,
            totalDeposit: msg.value,
            startTime: block.timestamp,
            duration: _duration,
            totalWithdrawn: 0,
            active: true
        });

        emit StreamCreated(
            streamId,
            _companyId,
            msg.sender,
            _employee,
            msg.value,
            _duration
        );

        nextStreamId++;

        return streamId;
    }


    // =====================================================
    // GET UNLOCKED / VESTED AMOUNT
    // =====================================================

    function getUnlockedAmount(
        uint256 _streamId
    )
        public
        view
        returns (uint256)
    {
        require(
            _streamId < nextStreamId,
            "Stream does not exist"
        );

        Stream storage stream =
            streams[_streamId];

        // If cancelled/closed, vesting must stop.
        // During cancellation totalWithdrawn is set
        // to the vested amount at cancellation.
        if (!stream.active) {
            return stream.totalWithdrawn;
        }

        uint256 endTime =
            stream.startTime +
            stream.duration;

        // Stream completed
        if (block.timestamp >= endTime) {
            return stream.totalDeposit;
        }

        uint256 timeElapsed =
            block.timestamp -
            stream.startTime;

        // Vesting formula:
        //
        // totalDeposit * timeElapsed
        // --------------------------
        //         duration

        uint256 unlockedAmount =
            (
                stream.totalDeposit *
                timeElapsed
            )
            /
            stream.duration;

        return unlockedAmount;
    }


    // =====================================================
    // GET CLAIMABLE AMOUNT
    // =====================================================

    function getClaimableAmount(
        uint256 _streamId
    )
        public
        view
        returns (uint256)
    {
        require(
            _streamId < nextStreamId,
            "Stream does not exist"
        );

        Stream storage stream =
            streams[_streamId];

        if (!stream.active) {
            return 0;
        }

        uint256 unlockedAmount =
            getUnlockedAmount(_streamId);

        if (
            unlockedAmount <=
            stream.totalWithdrawn
        ) {
            return 0;
        }

        return
            unlockedAmount -
            stream.totalWithdrawn;
    }


    // =====================================================
    // EMPLOYEE WITHDRAW
    // =====================================================

    function withdraw(
        uint256 _streamId
    )
        external
    {
        require(
            _streamId < nextStreamId,
            "Stream does not exist"
        );

        Stream storage stream =
            streams[_streamId];

        require(
            stream.active,
            "Stream is closed"
        );

        require(
            msg.sender ==
            stream.employee,
            "Only employee can withdraw"
        );

        uint256 claimableAmount =
            getClaimableAmount(
                _streamId
            );

        require(
            claimableAmount > 0,
            "Nothing to withdraw"
        );

        // 1% protocol fee
        uint256 fee =
            claimableAmount / 100;

        // Employee receives 99%
        uint256 employeeAmount =
            claimableAmount - fee;

        // Update state BEFORE
        // external ETH transfer
        stream.totalWithdrawn +=
            claimableAmount;

        adminFees += fee;

        emit Withdrawn(
            _streamId,
            stream.employee,
            claimableAmount,
            fee,
            employeeAmount
        );

        // Transfer ETH
        (bool success, ) =
            payable(
                stream.employee
            ).call{
                value: employeeAmount
            }("");

        require(
            success,
            "Employee transfer failed"
        );
    }


    // =====================================================
    // CANCEL STREAM
    // =====================================================

    function cancelStream(
        uint256 _streamId
    )
        external
    {
        require(
            _streamId < nextStreamId,
            "Stream does not exist"
        );

        Stream storage stream =
            streams[_streamId];

        require(
            stream.active,
            "Stream already closed"
        );

        // Employer OR employee
        // can cancel
        require(
            msg.sender ==
                stream.employer ||
            msg.sender ==
                stream.employee,
            "Not authorized to cancel"
        );

        // Total amount vested
        // at cancellation time
        uint256 unlockedAmount =
            getUnlockedAmount(
                _streamId
            );

        // Vested but not yet withdrawn
        uint256 employeeVested =
            unlockedAmount -
            stream.totalWithdrawn;

        // Unvested amount goes
        // back to employer
        uint256 employerRefund =
            stream.totalDeposit -
            unlockedAmount;

        uint256 fee = 0;

        uint256 employeePayment = 0;

        if (employeeVested > 0) {

            // 1% fee
            fee =
                employeeVested / 100;

            employeePayment =
                employeeVested -
                fee;

            adminFees += fee;
        }

        // Mark all vested amount
        // as settled
        stream.totalWithdrawn =
            unlockedAmount;

        // Stream becomes CLOSED
        stream.active = false;

        emit StreamCancelled(
            _streamId,
            employeeVested,
            employerRefund
        );

        // Pay remaining vested
        // amount to employee
        if (employeePayment > 0) {

            (
                bool employeeSuccess,
            ) =
                payable(
                    stream.employee
                ).call{
                    value:
                        employeePayment
                }("");

            require(
                employeeSuccess,
                "Employee settlement failed"
            );
        }

        // Refund unvested amount
        // to employer
        if (employerRefund > 0) {

            (
                bool employerSuccess,
            ) =
                payable(
                    stream.employer
                ).call{
                    value:
                        employerRefund
                }("");

            require(
                employerSuccess,
                "Employer refund failed"
            );
        }
    }


    // =====================================================
    // CLAIM ADMIN FEES
    // =====================================================

    function claimAdminFees()
        external
    {
        require(
            msg.sender == admin,
            "Only admin can claim fees"
        );

        uint256 amount =
            adminFees;

        require(
            amount > 0,
            "No fees available"
        );

        // Reset before transfer
        adminFees = 0;

        emit AdminFeesClaimed(
            admin,
            amount
        );

        (
            bool success,
        ) =
            payable(admin).call{
                value: amount
            }("");

        require(
            success,
            "Admin fee transfer failed"
        );
    }
}