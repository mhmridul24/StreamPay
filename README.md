# StreamPay

StreamPay is a Corporate Micro-Salary & Vesting Protocol built with Solidity, Foundry, Anvil, Ethers.js v6, and Vanilla JavaScript.

## Project Overview

StreamPay allows an employer to create an ETH salary stream for a registered employee. Salary is vested continuously over time, and the employee can withdraw only the amount that has already unlocked.

The protocol deducts a 1% fee from vested salary withdrawals. The fee is stored inside the contract and can later be claimed by the protocol admin.

## Main Features

- Company registration
- Employee registration under a company
- ETH salary stream creation
- Continuous linear vesting
- Partial salary withdrawal
- 1% protocol fee
- Employer or employee stream cancellation
- Refund of unvested ETH to employer
- Admin fee withdrawal
- MetaMask wallet integration
- Anvil local blockchain support
- Role-based frontend
- Real-time vesting ticker

## Vesting Formula

Unlocked Amount:

```text
Total Deposit × Time Elapsed
----------------------------
Total Duration


If the stream duration has completed, the full deposit becomes unlocked.

Technology Stack
Solidity ^0.8.20
Foundry / Forge
Anvil
Ethers.js v6
HTML
CSS
Vanilla JavaScript
MetaMask
Smart Contract

Main contract:

src/StreamPay.sol

The smart contract contains:

registerCompany()
registerEmployee()
createStream()
getUnlockedAmount()
getClaimableAmount()
withdraw()
cancelStream()
claimAdminFees()
Testing

Automated Foundry tests are available in:

test/StreamPay.t.sol

Run the tests with:

forge test -vv

The test suite covers:

Company registration
Stream creation
Vesting calculation
Partial withdrawal
1% protocol fee
Cancellation
Employer refund
Employee cancellation
Unauthorized cancellation
Admin fee claiming
Run Local Blockchain

Start Anvil:

anvil

Default local RPC:

http://127.0.0.1:8545

Chain ID:

31337
Deploy Contract

Example deployment command:

forge create src/StreamPay.sol:StreamPay \
--rpc-url http://127.0.0.1:8545 \
--private-key <ANVIL_PRIVATE_KEY> \
--broadcast
Run Frontend

Move into the frontend directory:

cd frontend

Install dependencies:

npm install

Start the Vite development server:

npx vite

Then open the localhost URL shown by Vite, usually:

http://localhost:5173
MetaMask Setup

Add the Anvil local network to MetaMask:

Network Name: Anvil Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH

Import Anvil test accounts using their local development private keys.

Do not use real-wallet private keys for local development.

User Roles
Admin

The contract deployer acts as Admin.

Admin can:

View accumulated protocol fees
Claim protocol fees
Employer

Employer can:

Register a company
Register employees
Create salary streams
View outgoing streams
Cancel active streams
Employee

Employee can:

View incoming streams
See live unlocked salary
See claimable salary
Withdraw vested salary
Cancel active streams
Cancellation

When an active stream is cancelled:

Remaining vested salary is settled to the employee
A 1% protocol fee is deducted
Unvested ETH is refunded to the employer
The stream becomes closed
Frontend

Frontend files are located inside:

frontend/

Main frontend files:

frontend/index.html
frontend/style.css
frontend/app.js

The frontend uses Ethers.js v6 to communicate with the smart contract through MetaMask.

Author

Mahamudul Hasan

Repository

https://github.com/mhmridul24/StreamPay