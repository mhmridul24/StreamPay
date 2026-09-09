// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StreamPay.sol";

contract StreamPayTest is Test {

    StreamPay public streamPay;

    address public employer = address(0x1);
    address public employee = address(0x2);
    address public stranger = address(0x3);

    uint256 public companyId = 101;

    function setUp() public {

        // Test contract deploys StreamPay
        // Therefore this test contract becomes admin
        streamPay = new StreamPay();

        // Give employer 100 ETH
        vm.deal(employer, 100 ether);

        // Give employee some ETH for gas/testing
        vm.deal(employee, 10 ether);

        // Register company
        vm.prank(employer);
        streamPay.registerCompany(companyId);

        // Register employee
        vm.prank(employer);
        streamPay.registerEmployee(
            companyId,
            employee
        );
    }


    // ============================================
    // TEST 1: COMPANY REGISTRATION
    // ============================================

    function testCompanyRegistration() public {

        assertEq(
            streamPay.companyOwners(companyId),
            employer
        );

        assertTrue(
            streamPay.companyEmployees(
                companyId,
                employee
            )
        );
    }


    // ============================================
    // TEST 2: CREATE STREAM
    // ============================================

    function testCreateStream() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        assertEq(
            streamPay.nextStreamId(),
            1
        );

        (
            uint256 id,
            uint256 storedCompanyId,
            address storedEmployer,
            address storedEmployee,
            uint256 totalDeposit,
            ,
            uint256 duration,
            uint256 totalWithdrawn,
            bool active
        ) = streamPay.streams(0);

        assertEq(id, 0);
        assertEq(storedCompanyId, companyId);
        assertEq(storedEmployer, employer);
        assertEq(storedEmployee, employee);
        assertEq(totalDeposit, 1 ether);
        assertEq(duration, 100);
        assertEq(totalWithdrawn, 0);
        assertTrue(active);
    }


    // ============================================
    // TEST 3: 50% VESTING
    // ============================================

    function testVestingMath() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        // Move blockchain time
        // exactly 50 seconds forward
        vm.warp(startTime + 50);

        uint256 unlocked =
            streamPay.getUnlockedAmount(0);

        assertEq(
            unlocked,
            0.5 ether
        );
    }


    // ============================================
    // TEST 4: EMPLOYEE WITHDRAW + 1% FEE
    // ============================================

    function testWithdrawAndFee() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        // Move to 50%
        vm.warp(startTime + 50);

        uint256 employeeBefore =
            employee.balance;

        // Employee withdraws
        vm.prank(employee);
        streamPay.withdraw(0);

        uint256 employeeAfter =
            employee.balance;

        // 50% of 1 ETH = 0.5 ETH
        //
        // 1% fee = 0.005 ETH
        //
        // employee receives = 0.495 ETH

        assertEq(
            employeeAfter - employeeBefore,
            0.495 ether
        );

        assertEq(
            streamPay.adminFees(),
            0.005 ether
        );

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint256 totalWithdrawn,
        ) = streamPay.streams(0);

        assertEq(
            totalWithdrawn,
            0.5 ether
        );
    }


    // ============================================
    // TEST 5: CANCEL STREAM + EMPLOYER REFUND
    // ============================================

    function testCancelStream() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        // 40% of stream has vested
        vm.warp(startTime + 40);

        uint256 employerBefore =
            employer.balance;

        uint256 employeeBefore =
            employee.balance;

        vm.prank(employer);
        streamPay.cancelStream(0);

        uint256 employerAfter =
            employer.balance;

        uint256 employeeAfter =
            employee.balance;

        // 40% vested = 0.4 ETH
        //
        // Employee fee:
        // 1% of 0.4 = 0.004 ETH
        //
        // Employee gets:
        // 0.396 ETH
        //
        // Employer gets:
        // 0.6 ETH refund

        assertEq(
            employerAfter - employerBefore,
            0.6 ether
        );

        assertEq(
            employeeAfter - employeeBefore,
            0.396 ether
        );

        assertEq(
            streamPay.adminFees(),
            0.004 ether
        );

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            bool active
        ) = streamPay.streams(0);

        assertFalse(active);
    }


    // ============================================
    // TEST 6: EMPLOYEE CAN ALSO CANCEL
    // ============================================

    function testEmployeeCanCancel() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        vm.warp(startTime + 25);

        vm.prank(employee);
        streamPay.cancelStream(0);

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            bool active
        ) = streamPay.streams(0);

        assertFalse(active);
    }


    // ============================================
    // TEST 7: STRANGER CANNOT CANCEL
    // ============================================

    function testStrangerCannotCancel() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        vm.prank(stranger);

        vm.expectRevert(
            "Not authorized to cancel"
        );

        streamPay.cancelStream(0);
    }


    // ============================================
    // TEST 8: ONLY EMPLOYEE CAN WITHDRAW
    // ============================================

    function testOnlyEmployeeCanWithdraw() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        vm.warp(startTime + 50);

        vm.prank(stranger);

        vm.expectRevert(
            "Only employee can withdraw"
        );

        streamPay.withdraw(0);
    }


    // ============================================
    // TEST 9: ADMIN CLAIMS FEES
    // ============================================

    function testAdminCanClaimFees() public {

        vm.prank(employer);

        streamPay.createStream{
            value: 1 ether
        }(
            companyId,
            employee,
            100
        );

        (
            ,
            ,
            ,
            ,
            ,
            uint256 startTime,
            ,
            ,
        ) = streamPay.streams(0);

        vm.warp(startTime + 50);

        vm.prank(employee);
        streamPay.withdraw(0);

        // Fee should now be 0.005 ETH
        assertEq(
            streamPay.adminFees(),
            0.005 ether
        );

        uint256 adminBefore =
            address(this).balance;

        streamPay.claimAdminFees();

        uint256 adminAfter =
            address(this).balance;

        assertEq(
            adminAfter - adminBefore,
            0.005 ether
        );

        assertEq(
            streamPay.adminFees(),
            0
        );
    }


    // Allows this test contract
    // to receive ETH as admin
    receive() external payable {}
}