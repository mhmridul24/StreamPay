# 💸 StreamPay

### Corporate Micro-Salary & Vesting Protocol

StreamPay is a decentralized salary-streaming and vesting protocol built with **Solidity, Foundry, Anvil, Ethers.js v6, MetaMask, and Vanilla JavaScript**.

It enables employers to deposit ETH into salary streams for registered employees. Instead of waiting for a fixed payday, employees continuously earn access to their salary as it vests over time.

---

## 📌 Project Overview

StreamPay provides a simple on-chain mechanism for continuous salary vesting.

An employer creates a salary stream by depositing ETH, selecting a registered employee, and defining the stream duration. The deposited salary then unlocks linearly over time.

Employees can withdraw only the portion that has already vested. A **1% protocol fee** is deducted from vested withdrawals and accumulated for the protocol administrator.

If a stream is cancelled, the employee receives the remaining vested portion while the unvested ETH is refunded to the employer.

---

## ✨ Key Features

- 🏢 Company registration
- 👤 Employee registration under a company
- 💰 ETH-funded salary streams
- ⏱️ Continuous linear vesting
- 📈 Real-time unlocked salary calculation
- 💸 Partial salary withdrawals
- 🧾 1% protocol fee
- ❌ Employer or employee stream cancellation
- ↩️ Automatic refund of unvested ETH
- 👑 Admin protocol-fee withdrawal
- 🦊 MetaMask integration
- ⚡ Anvil local blockchain
- 👥 Role-based user interface
- 🔄 Real-time 1-second vesting ticker

---

## ⚙️ How StreamPay Works

```text
Employer
   │
   │ Creates salary stream + deposits ETH
   ▼
┌───────────────────────┐
│       StreamPay       │
│    Smart Contract     │
└───────────────────────┘
   │              │
   │              │
   ▼              ▼
Employee       Protocol Admin
Vested ETH     1% Fee
```

The salary remains inside the smart contract and unlocks gradually according to the stream duration.

---

## 🧮 Vesting Formula

The unlocked salary is calculated using:

```text
                   Total Deposit × Time Elapsed
Unlocked Amount = ───────────────────────────────
                         Total Duration
```

If the stream duration has already ended:

```text
Unlocked Amount = Total Deposit
```

### Example

For a stream containing **1 ETH** with a duration of **1,000 seconds**:

```text
After 250 seconds → 0.25 ETH unlocked
After 500 seconds → 0.50 ETH unlocked
After 750 seconds → 0.75 ETH unlocked
After 1,000 seconds → 1.00 ETH unlocked
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Solidity ^0.8.20 | Smart contract development |
| Foundry / Forge | Compilation, testing and deployment |
| Anvil | Local Ethereum blockchain |
| Ethers.js v6 | Frontend-blockchain interaction |
| MetaMask | Wallet connection and transaction signing |
| HTML5 | Frontend structure |
| CSS3 | User interface styling |
| Vanilla JavaScript | Frontend application logic |
| Vite | Frontend development server |

---

## 📁 Project Structure

```text
StreamPay/
│
├── src/
│   └── StreamPay.sol
│
├── test/
│   └── StreamPay.t.sol
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── package.json
│   └── package-lock.json
│
├── lib/
│   └── forge-std/
│
├── foundry.toml
├── foundry.lock
└── README.md
```

---

## 📜 Smart Contract Functions

The main smart contract is located at:

```text
src/StreamPay.sol
```

### Company & Employee Management

| Function | Description |
|---|---|
| `registerCompany()` | Registers a company ID to the caller |
| `registerEmployee()` | Registers an employee under a company |

### Salary Streaming

| Function | Description |
|---|---|
| `createStream()` | Creates and funds a new salary stream |
| `getUnlockedAmount()` | Calculates total vested salary |
| `getClaimableAmount()` | Calculates currently withdrawable salary |
| `withdraw()` | Withdraws vested salary |
| `cancelStream()` | Cancels an active salary stream |

### Administration

| Function | Description |
|---|---|
| `claimAdminFees()` | Allows the admin to withdraw accumulated protocol fees |

---

## 👥 User Roles

### 👑 Admin

The smart-contract deployer becomes the protocol administrator.

The Admin can:

- View accumulated protocol fees
- Claim accumulated protocol fees

### 🏢 Employer

An Employer can:

- Register a company
- Register employees
- Create ETH salary streams
- View outgoing streams
- Monitor live vesting
- Cancel active streams

### 👤 Employee

An Employee can:

- View incoming salary streams
- Monitor live unlocked salary
- View the currently claimable amount
- Partially withdraw vested salary
- Cancel an active stream

---

## 💸 Withdrawal & Protocol Fee

Employees can withdraw only salary that has already vested.

For every withdrawal:

```text
Vested Claimable Amount
          │
          ├── 99% → Employee
          │
          └──  1% → Protocol Admin Fee Balance
```

The admin fee remains accumulated inside the smart contract until the administrator calls:

```solidity
claimAdminFees()
```

---

## ❌ Stream Cancellation

An active stream can be cancelled by either the **Employer** or the **Employee**.

When cancellation occurs:

```text
Total Stream Deposit
        │
        ├── Vested but unsettled amount
        │       ├── 99% → Employee
        │       └──  1% → Admin Fee
        │
        └── Unvested amount → Employer Refund
```

After settlement, the stream becomes **Closed**.

---

## 🧪 Testing

Automated tests are implemented using Foundry.

Test file:

```text
test/StreamPay.t.sol
```

Run the complete test suite:

```bash
forge test -vv
```

The tests cover the major protocol functionality, including:

- Company registration
- Employee registration
- Stream creation
- Linear vesting calculation
- Partial withdrawals
- 1% protocol fee calculation
- Stream cancellation
- Employer refund
- Employee cancellation
- Unauthorized cancellation prevention
- Admin fee claiming

---

## 🚀 Running the Project Locally

### 1. Clone the Repository

```bash
git clone https://github.com/mhmridul24/StreamPay.git
cd StreamPay
```

### 2. Build the Smart Contract

```bash
forge build
```

### 3. Run the Tests

```bash
forge test -vv
```

### 4. Start Anvil

Open a separate terminal:

```bash
anvil
```

Anvil will start a local Ethereum blockchain.

```text
RPC URL:  http://127.0.0.1:8545
Chain ID: 31337
```

> Keep the Anvil terminal running while using StreamPay.

---

## 📤 Deploy the Smart Contract

Using one of Anvil's local development accounts:

```bash
forge create src/StreamPay.sol:StreamPay \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <ANVIL_PRIVATE_KEY> \
  --broadcast
```

After successful deployment, Forge will display:

```text
Deployer:         0x...
Deployed to:      0x...
Transaction hash: 0x...
```

> Use only Anvil development private keys. Never expose a real wallet private key.

---

## 🦊 MetaMask Configuration

Add the local Anvil blockchain as a custom MetaMask network:

| Setting | Value |
|---|---|
| Network Name | Anvil Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency Symbol | `ETH` |

Import the required Anvil development accounts into MetaMask for testing different roles.

---

## 🖥️ Run the Frontend

Move into the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npx vite
```

Open the URL displayed by Vite, usually:

```text
http://localhost:5173
```

Then connect MetaMask using the **Anvil Local** network.

---

## 📊 Real-Time Vesting Ticker

StreamPay displays the unlocked salary in real time.

The frontend initially reads the stream state from the blockchain:

```text
startTime
duration
totalDeposit
totalWithdrawn
```

It then recalculates the unlocked amount locally every **1 second** using the same integer vesting formula as the Solidity contract.

This provides a smooth live display without requiring a blockchain transaction every second.

---

## 🔐 Security & Validation

The protocol includes several validation checks:

- Stream deposit must be greater than zero
- Stream duration must be greater than 15 seconds
- Employee must be registered under the company
- Only the registered company owner can create streams
- Only vested funds can be withdrawn
- Only authorized participants can cancel a stream
- Only the admin can claim protocol fees
- Contract state is updated before ETH transfers where applicable

---

## 🌐 Local Development Configuration

During local development:

```text
Network:          Anvil Local
Chain ID:         31337
RPC:              http://127.0.0.1:8545
Frontend:         http://localhost:5173
Protocol Fee:     1%
```

---

## 👨‍💻 Author

**Mahamudul Hasan**

Project developed as part of a blockchain course project on smart-contract-based corporate micro-salary streaming and vesting.

---

## 🔗 Repository

**GitHub:** https://github.com/mhmridul24/StreamPay