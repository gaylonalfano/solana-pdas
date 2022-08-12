// import * as anchor from "@project-serum/anchor";
// import { SolanaPdas } from "../target/types/solana_pdas";

// function shortKey(key: anchor.web3.PublicKey) {
//   return key.toString().substring(0, 8);
// }

// describe("pdas", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const program = anchor.workspace.SolanaPdas as anchor.Program<SolanaPdas>;

//   async function generateKeypair() {
//     let keypair = anchor.web3.Keypair.generate();
//     await provider.connection.requestAirdrop(
//       keypair.publicKey,
//       2 * anchor.web3.LAMPORTS_PER_SOL
//     );
//     await new Promise((resolve) => setTimeout(resolve, 3 * 1000)); // Sleep 3s
//     return keypair;
//   }

//   async function derivePda(color: string, pubkey: anchor.web3.PublicKey) {
//     let [pda, _] = await anchor.web3.PublicKey.findProgramAddress(
//       [pubkey.toBuffer(), Buffer.from("_"), Buffer.from(color)],
//       program.programId
//     );
//     return pda;
//   }

//   async function createLedgerAccount(
//     color: string,
//     pda: anchor.web3.PublicKey,
//     wallet: anchor.web3.Keypair
//   ) {
//     await program.methods
//       .createLedger(color)
//       .accounts({
//         ledgerAccount: pda,
//         wallet: wallet.publicKey,
//       })
//       .signers([wallet])
//       .rpc();
//   }

//   async function modifyLedgerAccount(
//     color: string,
//     newBalance: number,
//     wallet: anchor.web3.Keypair
//   ) {
//     console.log("--------------------------------------------------");
//     let data;
//     let pda = await derivePda(color, wallet.publicKey);

//     console.log(
//       `Checking if account ${shortKey(pda)} exists for color: ${color}...`
//     );
//     try {
//       data = await program.account.ledger.fetch(pda);
//       console.log("It does.");
//     } catch (e) {
//       console.log("It does NOT. Creating...");
//       await createLedgerAccount(color, pda, wallet);
//       data = await program.account.ledger.fetch(pda);
//     }

//     console.log("Success.");
//     console.log("Data:");
//     console.log(`    Color: ${data.color}   Balance: ${data.balance}`);
//     console.log(
//       `Modifying balance of ${data.color} from ${data.balance} to ${newBalance}`
//     );

//     await program.methods
//       .modifyLedgerAccount(newBalance)
//       .accounts({
//         ledgerAccount: pda,
//         wallet: wallet.publicKey,
//       })
//       .signers([wallet])
//       .rpc();

//     data = await program.account.ledger.fetch(pda);
//     console.log("New Data:");
//     console.log(`    Color: ${data.color}   Balance: ${data.balance}`);
//     console.log("Success.");
//   }

//   it("An example of PDAs in action", async () => {
//     const testKeypair1 = await generateKeypair();
//     await modifyLedgerAccount("red", 2, testKeypair1);
//     await modifyLedgerAccount("red", 4, testKeypair1);
//     await modifyLedgerAccount("blue", 2, testKeypair1);

//     const testKeypair2 = await generateKeypair();
//     await modifyLedgerAccount("red", 3, testKeypair2);
//     await modifyLedgerAccount("green", 3, testKeypair2);
//   });
// });

// ======= MINE BELOW
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaPdas } from "../target/types/solana_pdas";

function shortKey(key: anchor.web3.PublicKey) {
  // For condensed logs
  return key.toString().substring(0, 8);
}

describe("solana-pdas", () => {
  // Configure the client to use the local cluster.
  // NOTE Grab provider as const so we have access to its methods
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaPdas as Program<SolanaPdas>;

  async function generateKeypair() {
    // Ensure that new wallet keypair has enough SOL
    let keypair = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(
      keypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    // Sleep for devnet
    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
    return keypair;
  }

  async function derivePda(color: string, pubkey: anchor.web3.PublicKey) {
    // NOTE This is key! We can derive PDA WITHOUT hitting our program!
    // Then we can use this PDA address in our functions as a check to see
    // whether there is a ledger account at this PDA address.
    // Then, MOST IMPORTANTLY, we can fetch the account's data from the CLIENT
    // and use its data.
    // NOTE pubkey is actually provider.wallet.publicKey
    let [pda, _] = await anchor.web3.PublicKey.findProgramAddress(
      [pubkey.toBuffer(), Buffer.from("_"), Buffer.from(color)],
      program.programId // The program that we want to OWN the PDA
    );

    return pda;
  }

  async function createLedgerAccount(
    color: string,
    pda: anchor.web3.PublicKey,
    wallet: anchor.web3.Keypair
  ) {
    // Calls the program's on-chain create_ledger instruction function
    // to create a ledger account LOCATED at our generated PDA address!
    // NOTE This requires same args i.e., Context, color, system
    // NOTE We're technically creating a ledger account located at
    // this PDA address!
    await program.methods
      .createLedger(color)
      .accounts({
        // Q: Do I use snake_case or camelCase?
        // NOTE Tutorial used camelCase even though it's snake_case in program
        // A: Looks like I use camelCase...
        ledgerAccount: pda,
        wallet: wallet.publicKey,
        // NOTE Anchor automatically adds System Program (and other programs if required)
      })
      .signers([wallet])
      .rpc();
  }

  async function modifyLedgerAccount(
    color: string,
    newBalance: number,
    wallet: anchor.web3.Keypair
  ) {
    console.log("------------------------------------");
    // 1. Retrieve the PDA using helper
    // NOTE Don't pass pda address. Just pass color
    let data; // Is type Ledger
    let pda = await derivePda(color, wallet.publicKey);

    // 2. Try to retreive PDA account data if it exists
    console.log(
      `Checking if account ${shortKey(pda)} exists for color: ${color}...`
    );
    try {
      // NOTE We're technically seeing if our PDA address has a
      // ledger account at its location (address)
      data = await program.account.ledger.fetch(pda);
      console.log(`Account already exists!`);
    } catch (e) {
      // console.log(e);
      console.log(`Account ${shortKey(pda)} does NOT exist!`);
      console.log("Creating account...");
      // 1. Create account using helper that calls program instruction
      await createLedgerAccount(color, pda, wallet);
      // 2. Retrieve account data
      data = await program.account.ledger.fetch(pda);
    }

    console.log(
      `SUCCESS! Wallet: ${shortKey(wallet.publicKey)} -- PDA: ${shortKey(pda)} `
    );
    console.log("Our PDA has a ledger account with data:\n");
    console.log(`    Color: ${data.color}   Balance: ${data.balance}`);
    console.log(
      `Modifying balance of ${data.color} from ${data.balance} to ${newBalance}`
    );

    // 3. Make our modifications to the account using on-chain program function
    // NOTE This is another program function instruction
    await program.methods
      .modifyLedger(newBalance)
      .accounts({
        ledgerAccount: pda,
        wallet: wallet.publicKey,
      })
      .signers([wallet])
      .rpc();

    // 4. Retrieve the updated data one last time
    data = await program.account.ledger.fetch(pda);
    // console.log(`Updated data for account located at:`);
    console.log(
      `UPDATED! Wallet: ${shortKey(wallet.publicKey)} -- PDA: ${shortKey(pda)} `
    );
    console.log(`    Color: ${data.color}   Balance: ${data.balance}`);
    console.log("Successfully modified ledger account!");
  }

  it("An example of PDAs in action", async () => {
    // Q: Is this new keypair essentially representing another
    // wallet???? Which is then used to create/modify ledger accounts?
    // A: YES! We need a Keypair (Wallet) to sign these transactions,
    // so this is a quick/easy way to simulate multiple users.
    const testKeypair1 = await generateKeypair();
    await modifyLedgerAccount("red", 2, testKeypair1);
    await modifyLedgerAccount("red", 4, testKeypair1);
    await modifyLedgerAccount("blue", 3, testKeypair1);

    const testKeypair2 = await generateKeypair();
    await modifyLedgerAccount("red", 3, testKeypair2);
    await modifyLedgerAccount("green", 5, testKeypair2);
  });
});
