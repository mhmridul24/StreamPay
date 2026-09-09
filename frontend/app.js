import { ethers } from "ethers";

const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
    "function admin() view returns (address)",
    "function adminFees() view returns (uint256)",
    "function nextStreamId() view returns (uint256)",

    "function companyOwners(uint256) view returns (address)",
    "function companyEmployees(uint256,address) view returns (bool)",

    "function registerCompany(uint256)",
    "function registerEmployee(uint256,address)",

    "function createStream(uint256,address,uint256) payable returns (uint256)",

    "function getUnlockedAmount(uint256) view returns (uint256)",
    "function getClaimableAmount(uint256) view returns (uint256)",

    "function withdraw(uint256)",
    "function cancelStream(uint256)",
    "function claimAdminFees()",

    "function streams(uint256) view returns (uint256 id,uint256 companyId,address employer,address employee,uint256 totalDeposit,uint256 startTime,uint256 duration,uint256 totalWithdrawn,bool active)"
];

let provider;
let signer;
let contract;
let currentAccount = null;

let tickerInterval = null;

const connectWalletBtn =
    document.getElementById("connectWalletBtn");

const walletAddress =
    document.getElementById("walletAddress");

const networkStatus =
    document.getElementById("networkStatus");

const roleText =
    document.getElementById("roleText");

const adminSection =
    document.getElementById("adminSection");

const employerSection =
    document.getElementById("employerSection");

const employeeSection =
    document.getElementById("employeeSection");

const adminFeeBalance =
    document.getElementById("adminFeeBalance");

const statusMessage =
    document.getElementById("statusMessage");

const employerStreams =
    document.getElementById("employerStreams");

const employeeStreams =
    document.getElementById("employeeStreams");

function setStatus(message) {
    statusMessage.textContent = message;
}

function shortAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function connectWallet() {

    if (!window.ethereum) {
        alert("MetaMask is not installed.");
        return;
    }

    try {
        provider =
            new ethers.BrowserProvider(window.ethereum);

        await provider.send(
            "eth_requestAccounts",
            []
        );

        const network =
            await provider.getNetwork();

        if (network.chainId !== 31337n) {
            networkStatus.textContent =
                `Wrong Network - Chain ID ${network.chainId}`;

            setStatus(
                "Please switch MetaMask to Anvil Local."
            );

            return;
        }

        networkStatus.textContent =
            "Anvil Local - Chain ID 31337";

        signer =
            await provider.getSigner();

        currentAccount =
            await signer.getAddress();

        walletAddress.textContent =
            currentAccount;

        contract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                ABI,
                signer
            );

        connectWalletBtn.textContent =
            "Wallet Connected";

        setStatus(
            "Wallet connected successfully."
        );

        await detectRole();
        await loadStreams();

        startTicker();

    } catch (error) {
        console.error(error);
        setStatus(error.message);
    }
}

async function detectRole() {

    adminSection.classList.add("hidden");
    employerSection.classList.add("hidden");
    employeeSection.classList.add("hidden");

    const adminAddress =
        await contract.admin();

    let roles = [];

    if (
        currentAccount.toLowerCase() ===
        adminAddress.toLowerCase()
    ) {
        roles.push("Admin");
        adminSection.classList.remove("hidden");
        employerSection.classList.remove("hidden");
    }

    const nextId =
        Number(await contract.nextStreamId());

    let isEmployer = false;
    let isEmployee = false;

    for (let i = 0; i < nextId; i++) {

        const stream =
            await contract.streams(i);

        if (
            stream.employer.toLowerCase() ===
            currentAccount.toLowerCase()
        ) {
            isEmployer = true;
        }

        if (
            stream.employee.toLowerCase() ===
            currentAccount.toLowerCase()
        ) {
            isEmployee = true;
        }
    }

    if (isEmployer) {
        roles.push("Employer");
        employerSection.classList.remove("hidden");
    }

    if (isEmployee) {
        roles.push("Employee");
        employeeSection.classList.remove("hidden");
    }

    if (roles.length === 0) {
        roles.push("Unassigned");
    }

    roleText.textContent =
        roles.join(" / ");

    if (
        currentAccount.toLowerCase() ===
        adminAddress.toLowerCase()
    ) {
        await updateAdminFees();
    }
}

async function updateAdminFees() {

    const fees =
        await contract.adminFees();

    adminFeeBalance.textContent =
        `${ethers.formatEther(fees)} ETH`;
}

document
    .getElementById("registerCompanyBtn")
    .addEventListener(
        "click",
        async () => {

            const companyId =
                document
                    .getElementById(
                        "companyIdInput"
                    )
                    .value;

            if (!companyId) {
                alert("Enter Company ID");
                return;
            }

            try {
                setStatus(
                    "Registering company..."
                );

                const tx =
                    await contract.registerCompany(
                        companyId
                    );

                await tx.wait();

                setStatus(
                    "Company registered successfully."
                );

            } catch (error) {
                console.error(error);
                setStatus(
                    error.shortMessage ||
                    error.message
                );
            }
        }
    );

document
    .getElementById("registerEmployeeBtn")
    .addEventListener(
        "click",
        async () => {

            const companyId =
                document
                    .getElementById(
                        "companyIdInput"
                    )
                    .value;

            const employeeAddress =
                document
                    .getElementById(
                        "employeeAddressInput"
                    )
                    .value;

            if (
                !companyId ||
                !employeeAddress
            ) {
                alert(
                    "Enter company ID and employee address"
                );
                return;
            }

            try {

                setStatus(
                    "Registering employee..."
                );

                const tx =
                    await contract.registerEmployee(
                        companyId,
                        employeeAddress
                    );

                await tx.wait();

                setStatus(
                    "Employee registered successfully."
                );

            } catch (error) {
                console.error(error);

                setStatus(
                    error.shortMessage ||
                    error.message
                );
            }
        }
    );

document
    .getElementById("createStreamBtn")
    .addEventListener(
        "click",
        async () => {

            const companyId =
                document
                    .getElementById(
                        "streamCompanyIdInput"
                    )
                    .value;

            const employeeAddress =
                document
                    .getElementById(
                        "streamEmployeeInput"
                    )
                    .value;

            const duration =
                document
                    .getElementById(
                        "durationInput"
                    )
                    .value;

            const deposit =
                document
                    .getElementById(
                        "depositInput"
                    )
                    .value;

            if (
                !companyId ||
                !employeeAddress ||
                !duration ||
                !deposit
            ) {
                alert(
                    "Please fill all stream fields."
                );
                return;
            }

            try {

                setStatus(
                    "Creating salary stream..."
                );

                const tx =
                    await contract.createStream(
                        companyId,
                        employeeAddress,
                        duration,
                        {
                            value:
                                ethers.parseEther(
                                    deposit
                                )
                        }
                    );

                await tx.wait();

                setStatus(
                    "Stream created successfully."
                );

                await detectRole();
                await loadStreams();

            } catch (error) {
                console.error(error);

                setStatus(
                    error.shortMessage ||
                    error.message
                );
            }
        }
    );

document
    .getElementById("claimAdminFeesBtn")
    .addEventListener(
        "click",
        async () => {

            try {

                setStatus(
                    "Claiming admin fees..."
                );

                const tx =
                    await contract.claimAdminFees();

                await tx.wait();

                setStatus(
                    "Admin fees claimed."
                );

                await updateAdminFees();

            } catch (error) {

                console.error(error);

                setStatus(
                    error.shortMessage ||
                    error.message
                );
            }
        }
    );

async function withdrawStream(streamId) {

    try {

        setStatus(
            `Withdrawing from stream ${streamId}...`
        );

        const tx =
            await contract.withdraw(streamId);

        await tx.wait();

        setStatus(
            `Withdrawal successful for stream ${streamId}.`
        );

        await loadStreams();

    } catch (error) {

        console.error(error);

        setStatus(
            error.shortMessage ||
            error.message
        );
    }
}

async function cancelStream(streamId) {

    try {

        setStatus(
            `Cancelling stream ${streamId}...`
        );

        const tx =
            await contract.cancelStream(streamId);

        await tx.wait();

        setStatus(
            `Stream ${streamId} cancelled.`
        );

        await loadStreams();

        if (
            !adminSection.classList.contains(
                "hidden"
            )
        ) {
            await updateAdminFees();
        }

    } catch (error) {

        console.error(error);

        setStatus(
            error.shortMessage ||
            error.message
        );
    }
}

async function loadStreams() {

    if (!contract || !currentAccount) {
        return;
    }

    const nextId =
        Number(await contract.nextStreamId());

    let employerHTML = "";
    let employeeHTML = "";

    for (let i = 0; i < nextId; i++) {

        const stream =
            await contract.streams(i);

        const employer =
            stream.employer.toLowerCase();

        const employee =
            stream.employee.toLowerCase();

        const current =
            currentAccount.toLowerCase();

        const totalDeposit =
            ethers.formatEther(
                stream.totalDeposit
            );

        const totalWithdrawn =
            ethers.formatEther(
                stream.totalWithdrawn
            );

        const status =
            stream.active
                ? "Active"
                : "Closed";

        if (employer === current) {

            employerHTML += `
                <div class="stream-card">
                    <div class="stream-title">
                        Stream #${i}
                    </div>

                    <p>
                        Employee:
                        ${shortAddress(stream.employee)}
                    </p>

                    <p>
                        Deposit:
                        ${totalDeposit} ETH
                    </p>

                    <p>
                        Duration:
                        ${stream.duration} sec
                    </p>

                    <p>
                        Withdrawn:
                        ${totalWithdrawn} ETH
                    </p>

                    <p>
                        Status:
                        <span class="${
                            stream.active
                            ? "active-text"
                            : "closed-text"
                        }">
                            ${status}
                        </span>
                    </p>

                    <p>
                        Live Unlocked:
                        <span
                            id="employer-unlocked-${i}"
                        >
                            0 ETH
                        </span>
                    </p>

                    ${
                        stream.active
                        ? `
                        <button
                            class="danger"
                            onclick="window.cancelStream(${i})"
                        >
                            Cancel Stream
                        </button>
                        `
                        : ""
                    }
                </div>
            `;
        }

        if (employee === current) {

            employeeHTML += `
                <div class="stream-card">

                    <div class="stream-title">
                        Stream #${i}
                    </div>

                    <p>
                        Employer:
                        ${shortAddress(stream.employer)}
                    </p>

                    <p>
                        Deposit:
                        ${totalDeposit} ETH
                    </p>

                    <p>
                        Duration:
                        ${stream.duration} sec
                    </p>

                    <p>
                        Withdrawn:
                        ${totalWithdrawn} ETH
                    </p>

                    <p>
                        Status:
                        <span class="${
                            stream.active
                            ? "active-text"
                            : "closed-text"
                        }">
                            ${status}
                        </span>
                    </p>

                    <p>
                        Live Unlocked:
                        <span
                            id="employee-unlocked-${i}"
                        >
                            0 ETH
                        </span>
                    </p>

                    <p>
                        Claimable:
                        <span
                            id="employee-claimable-${i}"
                        >
                            0 ETH
                        </span>
                    </p>

                    ${
                        stream.active
                        ? `
                        <button
                            class="success"
                            onclick="window.withdrawStream(${i})"
                        >
                            Withdraw
                        </button>

                        <button
                            class="danger"
                            onclick="window.cancelStream(${i})"
                        >
                            Cancel Stream
                        </button>
                        `
                        : ""
                    }
                </div>
            `;
        }
    }

    employerStreams.innerHTML =
        employerHTML ||
        "No outgoing streams found.";

    employeeStreams.innerHTML =
        employeeHTML ||
        "No incoming streams found.";

    await updateLocalTickerValues();
}

async function updateLocalTickerValues() {

    if (!contract || !currentAccount) {
        return;
    }

    const nextId =
        Number(await contract.nextStreamId());

    const now =
        Math.floor(Date.now() / 1000);

    for (let i = 0; i < nextId; i++) {

        const stream =
            await contract.streams(i);

        let unlocked;

        if (!stream.active) {

            unlocked =
                stream.totalWithdrawn;

        } else {

            const startTime =
                Number(stream.startTime);

            const duration =
                Number(stream.duration);

            const deposit =
                stream.totalDeposit;

            const elapsed =
                Math.max(
                    0,
                    now - startTime
                );

            if (elapsed >= duration) {

                unlocked =
                    deposit;

            } else {

                unlocked =
                    (
                        deposit *
                        BigInt(elapsed)
                    )
                    /
                    BigInt(duration);
            }
        }

        let claimable = 0n;

        if (
            stream.active &&
            unlocked >
                stream.totalWithdrawn
        ) {
            claimable =
                unlocked -
                stream.totalWithdrawn;
        }

        const unlockedText =
            `${ethers.formatEther(unlocked)} ETH`;

        const claimableText =
            `${ethers.formatEther(claimable)} ETH`;

        const employerUnlocked =
            document.getElementById(
                `employer-unlocked-${i}`
            );

        if (employerUnlocked) {
            employerUnlocked.textContent =
                unlockedText;
        }

        const employeeUnlocked =
            document.getElementById(
                `employee-unlocked-${i}`
            );

        if (employeeUnlocked) {
            employeeUnlocked.textContent =
                unlockedText;
        }

        const employeeClaimable =
            document.getElementById(
                `employee-claimable-${i}`
            );

        if (employeeClaimable) {
            employeeClaimable.textContent =
                claimableText;
        }
    }
}

function startTicker() {

    if (tickerInterval) {
        clearInterval(tickerInterval);
    }

    tickerInterval =
        setInterval(
            updateLocalTickerValues,
            1000
        );
}

window.withdrawStream =
    withdrawStream;

window.cancelStream =
    cancelStream;

connectWalletBtn.addEventListener(
    "click",
    connectWallet
);

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        async () => {

            setStatus(
                "MetaMask account changed."
            );

            await connectWallet();
        }
    );

    window.ethereum.on(
        "chainChanged",
        () => {
            window.location.reload();
        }
    );

    setStatus(
        "MetaMask detected. Click Connect MetaMask."
    );

} else {

    setStatus(
        "MetaMask not detected."
    );
}