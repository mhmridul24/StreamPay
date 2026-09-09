import { ethers } from "ethers";

// =====================================================
// CONTRACT CONFIGURATION
// =====================================================

const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
    "function admin() view returns (address)",
    "function adminFees() view returns (uint256)",
    "function nextStreamId() view returns (uint256)",
    "function companyOwners(uint256) view returns (address)",
    "function companyEmployees(uint256,address) view returns (bool)",
    "function streams(uint256) view returns (uint256 id,uint256 companyId,address employer,address employee,uint256 totalDeposit,uint256 startTime,uint256 duration,uint256 totalWithdrawn,bool active)",
    "function getUnlockedAmount(uint256) view returns (uint256)",
    "function getClaimableAmount(uint256) view returns (uint256)",

    "function registerCompany(uint256)",
    "function registerEmployee(uint256,address)",
    "function createStream(uint256,address,uint256) payable returns (uint256)",
    "function withdraw(uint256)",
    "function cancelStream(uint256)",
    "function claimAdminFees()",

    "event StreamCreated(uint256 indexed streamId,uint256 indexed companyId,address indexed employer,address employee,uint256 amount,uint256 duration)",
    "event Withdrawn(uint256 indexed streamId,address indexed employee,uint256 grossAmount,uint256 fee,uint256 employeeAmount)",
    "event StreamCancelled(uint256 indexed streamId,uint256 employeeVestedAmount,uint256 employerRefund)",
    "event AdminFeesClaimed(address indexed admin,uint256 amount)"
];


// =====================================================
// METAMASK PROVIDER SELECTION
// =====================================================

// =====================================================
// EIP-6963 METAMASK PROVIDER DISCOVERY
// =====================================================

let ethereum = null;

function discoverMetaMaskProvider() {

    return new Promise((resolve) => {

        let found = false;

        const handler = (event) => {

            const detail =
                event.detail;

            if (!detail) {
                return;
            }

            const info =
                detail.info;

            const walletProvider =
                detail.provider;

            // Specifically select MetaMask
            if (
                info?.name === "MetaMask" ||
                info?.rdns === "io.metamask"
            ) {

                if (found) {
                    return;
                }

                found = true;

                window.removeEventListener(
                    "eip6963:announceProvider",
                    handler
                );

                resolve(
                    walletProvider
                );
            }
        };

        window.addEventListener(
            "eip6963:announceProvider",
            handler
        );

        // Ask installed wallets
        // to announce themselves
        window.dispatchEvent(
            new Event(
                "eip6963:requestProvider"
            )
        );

        // Fallback
        setTimeout(() => {

            if (!found) {

                window.removeEventListener(
                    "eip6963:announceProvider",
                    handler
                );

                if (
                    window.ethereum &&
                    window.ethereum.isMetaMask
                ) {

                    resolve(
                        window.ethereum
                    );

                } else {

                    resolve(null);
                }
            }

        }, 1500);
    });
}


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let provider = null;

let signer = null;

let contract = null;

let currentAccount = null;

let tickerInterval = null;

let eventContract = null;


// Local copy of blockchain stream state.
// The 1-second ticker uses this cache,
// not RPC calls every second.
let streamCache =
    new Map();


// =====================================================
// HTML ELEMENTS
// =====================================================

const connectWalletBtn =
    document.getElementById(
        "connectWalletBtn"
    );

const walletAddress =
    document.getElementById(
        "walletAddress"
    );

const networkStatus =
    document.getElementById(
        "networkStatus"
    );

const roleText =
    document.getElementById(
        "roleText"
    );

const adminSection =
    document.getElementById(
        "adminSection"
    );

const employerSection =
    document.getElementById(
        "employerSection"
    );

const employeeSection =
    document.getElementById(
        "employeeSection"
    );

const adminFeeBalance =
    document.getElementById(
        "adminFeeBalance"
    );

const statusMessage =
    document.getElementById(
        "statusMessage"
    );

const employerStreams =
    document.getElementById(
        "employerStreams"
    );

const employeeStreams =
    document.getElementById(
        "employeeStreams"
    );


// =====================================================
// HELPERS
// =====================================================

function setStatus(message) {

    statusMessage.textContent =
        message;
}


function shortAddress(address) {

    if (!address) {
        return "";
    }

    return (
        address.slice(0, 6) +
        "..." +
        address.slice(-4)
    );
}


// =====================================================
// CONNECT METAMASK
// =====================================================

async function connectWallet(
    requestPermission = true
) {

    if (!ethereum) {

        setStatus(
            "MetaMask not detected."
        );

        alert(
            "MetaMask is not installed or could not be detected."
        );

        return;
    }


    try {

        // Ask MetaMask for permission
        // only when user clicks Connect.
        if (requestPermission) {

            await ethereum.request({
                method:
                    "eth_requestAccounts"
            });
        }


        // -----------------------------
        // CHECK CHAIN DIRECTLY
        // -----------------------------

        const chainIdHex =
            await ethereum.request({
                method: "eth_chainId"
            });


        const chainId =
            BigInt(chainIdHex);


        if (chainId !== 31337n) {

            networkStatus.textContent =
                `Wrong Network - Chain ID ${chainId}`;

            walletAddress.textContent =
                "Not connected";

            roleText.textContent =
                "Unknown";

            setStatus(
                "Please switch MetaMask to Anvil Local."
            );

            return;
        }


        networkStatus.textContent =
            "Anvil Local - Chain ID 31337";


        // -----------------------------
        // ETHERS PROVIDER
        // -----------------------------

        provider =
            new ethers.BrowserProvider(
                ethereum,
                "any"
            );


        provider.pollingInterval =
            1000;


        signer =
            await provider.getSigner();


        currentAccount =
            await signer.getAddress();


        walletAddress.textContent =
            currentAccount;


        // -----------------------------
        // CONTRACT
        // -----------------------------

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


        // Load blockchain state once
        await loadStreams();

        await detectRole();

        startTicker();

        await startEventListeners();


    } catch (error) {

        console.error(
            "Wallet connection error:",
            error
        );

        setStatus(
            error.shortMessage ||
            error.message ||
            "Wallet connection failed."
        );
    }
}


// =====================================================
// AUTO CONNECT
// =====================================================

async function autoConnectWallet() {

    if (!ethereum) {

        setStatus(
            "MetaMask not detected."
        );

        return;
    }


    try {

        const accounts =
            await ethereum.request({
                method: "eth_accounts"
            });


        if (accounts.length > 0) {

            await connectWallet(false);

        } else {

            setStatus(
                "MetaMask detected. Click Connect MetaMask."
            );
        }


    } catch (error) {

        console.error(
            "Auto-connect error:",
            error
        );

        setStatus(
            "MetaMask detected. Click Connect MetaMask."
        );
    }
}


// =====================================================
// ROLE DETECTION
// =====================================================

async function detectRole() {

    if (
        !contract ||
        !currentAccount
    ) {

        return;
    }


    adminSection.classList.add(
        "hidden"
    );

    employerSection.classList.add(
        "hidden"
    );

    employeeSection.classList.add(
        "hidden"
    );


    const adminAddress =
        await contract.admin();


    const current =
        currentAccount
            .toLowerCase();


    let roles = [];


    // Admin / Employer
    if (
        current ===
        adminAddress.toLowerCase()
    ) {

        roles.push("Admin");

        roles.push("Employer");

        adminSection
            .classList
            .remove("hidden");

        employerSection
            .classList
            .remove("hidden");

        await updateAdminFees();
    }


    let isEmployer = false;

    let isEmployee = false;


    for (
        const stream
        of streamCache.values()
    ) {

        if (
            stream.employer
                .toLowerCase() ===
            current
        ) {

            isEmployer = true;
        }


        if (
            stream.employee
                .toLowerCase() ===
            current
        ) {

            isEmployee = true;
        }
    }


    if (
        isEmployer &&
        !roles.includes(
            "Employer"
        )
    ) {

        roles.push("Employer");

        employerSection
            .classList
            .remove("hidden");
    }


    if (isEmployee) {

        roles.push("Employee");

        employeeSection
            .classList
            .remove("hidden");
    }


    if (roles.length === 0) {

        roles.push(
            "Unassigned"
        );
    }


    roleText.textContent =
        roles.join(" / ");
}


// =====================================================
// ADMIN FEE BALANCE
// =====================================================

async function updateAdminFees() {

    if (!contract) {
        return;
    }


    const fees =
        await contract.adminFees();


    adminFeeBalance.textContent =
        `${ethers.formatEther(
            fees
        )} ETH`;
}


// =====================================================
// REGISTER COMPANY
// =====================================================

document
    .getElementById(
        "registerCompanyBtn"
    )
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

                alert(
                    "Enter Company ID"
                );

                return;
            }


            try {

                setStatus(
                    "Registering company..."
                );


                const tx =
                    await contract
                        .registerCompany(
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


// =====================================================
// REGISTER EMPLOYEE
// =====================================================

document
    .getElementById(
        "registerEmployeeBtn"
    )
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
                    await contract
                        .registerEmployee(
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


// =====================================================
// CREATE STREAM
// =====================================================

document
    .getElementById(
        "createStreamBtn"
    )
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
                    await contract
                        .createStream(
                            companyId,
                            employeeAddress,
                            duration,
                            {
                                value:
                                    ethers
                                        .parseEther(
                                            deposit
                                        )
                            }
                        );


                await tx.wait();


                setStatus(
                    "Stream created successfully."
                );


                await loadStreams();

                await detectRole();


            } catch (error) {

                console.error(error);

                setStatus(
                    error.shortMessage ||
                    error.message
                );
            }
        }
    );


// =====================================================
// CLAIM ADMIN FEES
// =====================================================

document
    .getElementById(
        "claimAdminFeesBtn"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                setStatus(
                    "Claiming admin fees..."
                );


                const tx =
                    await contract
                        .claimAdminFees();


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


// =====================================================
// EMPLOYEE WITHDRAW
// =====================================================

async function withdrawStream(
    streamId
) {

    try {

        setStatus(
            `Withdrawing from stream ${streamId}...`
        );


        const tx =
            await contract
                .withdraw(
                    streamId
                );


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


// =====================================================
// CANCEL STREAM
// =====================================================

async function cancelStream(
    streamId
) {

    try {

        setStatus(
            `Cancelling stream ${streamId}...`
        );


        const tx =
            await contract
                .cancelStream(
                    streamId
                );


        await tx.wait();


        setStatus(
            `Stream ${streamId} cancelled.`
        );


        await loadStreams();


        if (
            !adminSection
                .classList
                .contains("hidden")
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


// =====================================================
// LOAD STREAMS FROM BLOCKCHAIN
// =====================================================

async function loadStreams() {

    if (
        !contract ||
        !currentAccount
    ) {

        return;
    }


    const nextId =
        Number(
            await contract
                .nextStreamId()
        );


    streamCache.clear();


    let employerHTML = "";

    let employeeHTML = "";


    const current =
        currentAccount
            .toLowerCase();


    for (
        let i = 0;
        i < nextId;
        i++
    ) {

        const result =
            await contract.streams(i);


        const stream = {

            id:
                Number(
                    result.id
                ),

            companyId:
                Number(
                    result.companyId
                ),

            employer:
                result.employer,

            employee:
                result.employee,

            totalDeposit:
                result.totalDeposit,

            startTime:
                Number(
                    result.startTime
                ),

            duration:
                Number(
                    result.duration
                ),

            totalWithdrawn:
                result.totalWithdrawn,

            active:
                result.active
        };


        streamCache.set(
            i,
            stream
        );


        const employer =
            stream.employer
                .toLowerCase();


        const employee =
            stream.employee
                .toLowerCase();


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


        // =================================
        // EMPLOYER VIEW
        // =================================

        if (
            employer === current
        ) {

            employerHTML += `
                <div class="stream-card">

                    <div class="stream-title">
                        Stream #${i}
                    </div>

                    <p>
                        Employee:
                        ${shortAddress(
                            stream.employee
                        )}
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
                        <span
                            class="${
                                stream.active
                                    ? "active-text"
                                    : "closed-text"
                            }"
                        >
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


        // =================================
        // EMPLOYEE VIEW
        // =================================

        if (
            employee === current
        ) {

            employeeHTML += `
                <div class="stream-card">

                    <div class="stream-title">
                        Stream #${i}
                    </div>

                    <p>
                        Employer:
                        ${shortAddress(
                            stream.employer
                        )}
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
                        <span
                            class="${
                                stream.active
                                    ? "active-text"
                                    : "closed-text"
                            }"
                        >
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


    updateLocalTickerValues();
}


// =====================================================
// LOCAL REAL-TIME TICKER
// =====================================================
//
// No blockchain request occurs here.
// State comes from streamCache.
//
// =====================================================

function updateLocalTickerValues() {

    if (
        !currentAccount ||
        streamCache.size === 0
    ) {

        return;
    }


    const now =
        Math.floor(
            Date.now() / 1000
        );


    for (
        const [i, stream]
        of streamCache.entries()
    ) {

        let unlocked;


        // Closed stream:
        // stop vesting immediately.
        if (!stream.active) {

            unlocked =
                stream.totalWithdrawn;

        } else {

            const elapsed =
                Math.max(
                    0,
                    now -
                    stream.startTime
                );


            if (
                elapsed >=
                stream.duration
            ) {

                unlocked =
                    stream.totalDeposit;

            } else {

                unlocked =
                    (
                        stream.totalDeposit *
                        BigInt(elapsed)
                    )
                    /
                    BigInt(
                        stream.duration
                    );
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
            `${ethers.formatEther(
                unlocked
            )} ETH`;


        const claimableText =
            `${ethers.formatEther(
                claimable
            )} ETH`;


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


// =====================================================
// START TICKER
// =====================================================

function startTicker() {

    if (tickerInterval) {

        clearInterval(
            tickerInterval
        );
    }


    tickerInterval =
        setInterval(
            updateLocalTickerValues,
            1000
        );
}


// =====================================================
// BONUS - LIVE EVENT AUTO SYNC
// =====================================================

async function startEventListeners() {

    if (!contract) {

        return;
    }


    // Clean listeners belonging to
    // previous wallet connection.
    if (eventContract) {

        try {

            await eventContract
                .removeAllListeners();

        } catch (error) {

            console.log(
                "Old event listener cleanup skipped."
            );
        }
    }


    eventContract =
        contract;


    // =================================
    // STREAM CREATED
    // =================================

    contract.on(
        "StreamCreated",
        async (
            streamId
        ) => {

            console.log(
                "StreamCreated:",
                streamId.toString()
            );


            setStatus(
                `New stream ${streamId.toString()} detected automatically.`
            );


            await loadStreams();

            await detectRole();
        }
    );


    // =================================
    // WITHDRAW
    // =================================

    contract.on(
        "Withdrawn",
        async (
            streamId
        ) => {

            console.log(
                "Withdrawn:",
                streamId.toString()
            );


            setStatus(
                `Stream ${streamId.toString()} withdrawal detected automatically.`
            );


            await loadStreams();


            if (
                !adminSection
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {

                await updateAdminFees();
            }
        }
    );


    // =================================
    // BONUS:
    // STREAM CANCELLED
    // =================================

    contract.on(
        "StreamCancelled",
        async (
            streamId
        ) => {

            console.log(
                "StreamCancelled:",
                streamId.toString()
            );


            setStatus(
                `Stream ${streamId.toString()} was cancelled. UI auto-synced without page reload.`
            );


            // Refresh state once after
            // receiving blockchain event.
            await loadStreams();

            await detectRole();


            if (
                !adminSection
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {

                await updateAdminFees();
            }
        }
    );


    // =================================
    // ADMIN FEES CLAIMED
    // =================================

    contract.on(
        "AdminFeesClaimed",
        async () => {

            if (
                !adminSection
                    .classList
                    .contains(
                        "hidden"
                    )
            ) {

                await updateAdminFees();
            }
        }
    );
}


// =====================================================
// EXPOSE FUNCTIONS TO HTML
// =====================================================

window.withdrawStream =
    withdrawStream;


window.cancelStream =
    cancelStream;


// =====================================================
// CONNECT BUTTON
// =====================================================

connectWalletBtn
    .addEventListener(
        "click",
        async () => {

            await connectWallet(true);
        }
    );


// =====================================================
// METAMASK EVENTS
// =====================================================

// =====================================================
// INITIALIZE METAMASK
// =====================================================

async function initializeMetaMask() {

    setStatus(
        "Detecting MetaMask..."
    );

    // Find the real MetaMask provider
    // using EIP-6963
    ethereum =
        await discoverMetaMaskProvider();


    if (!ethereum) {

        setStatus(
            "MetaMask not detected."
        );

        return;
    }


    // Expose for DevTools testing
    window.streamPayEthereum =
        ethereum;


    console.log(
        "MetaMask provider detected through EIP-6963"
    );


    // ---------------------------------
    // ACCOUNT CHANGE
    // ---------------------------------

    ethereum.on(
        "accountsChanged",
        async (accounts) => {

            if (
                accounts.length === 0
            ) {

                currentAccount =
                    null;

                walletAddress.textContent =
                    "Not connected";

                networkStatus.textContent =
                    "Not detected";

                roleText.textContent =
                    "Unknown";

                setStatus(
                    "MetaMask disconnected."
                );

                return;
            }


            setStatus(
                "MetaMask account changed."
            );


            await connectWallet(false);
        }
    );


    // ---------------------------------
    // CHAIN CHANGE
    // ---------------------------------

    ethereum.on(
        "chainChanged",
        async () => {

            console.log(
                "MetaMask network changed."
            );

            await connectWallet(false);
        }
    );


    // ---------------------------------
    // AUTO CONNECT
    // ---------------------------------

    await autoConnectWallet();
}


// Start wallet initialization
initializeMetaMask();