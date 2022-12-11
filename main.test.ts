import * as ethers from "ethers";
import { BytesLike } from "ethers";

const provider = new ethers.providers.AlchemyProvider(
  "goerli",
  process.env.ALCHEMY_GOERLI_KEY
);

// async function blockTime() {
//   const block = await provider.getBlock("latest");
//   return block.timestamp;
// }

// export const fastForwardTime = async (seconds: number) => {
//   await provider.send("evm_increaseTime", [seconds]);
//   await provider.send("evm_mine", []);
// };

describe("keys and address checks", () => {
  /// Create priv & public keys pair
  const signingKey = new ethers.utils.SigningKey(
    <BytesLike>process.env.PRIVATE_KEY
  );
  // Derive public key from private key
  const publicKey = ethers.utils.computePublicKey(
    <BytesLike>process.env.PRIVATE_KEY
  );
  it("Signing key public key and computePublicKey public key are the same", () => {
    expect(publicKey).toEqual(signingKey.publicKey);
  });
  it("Compute address returns the same address using public and private key", () => {
    const address = ethers.utils.computeAddress(publicKey);
    const addressFromPrivateKey = ethers.utils.computeAddress(
      signingKey.privateKey
    );
    expect(addressFromPrivateKey).toEqual(address);
  });
});

describe("transaction checks", () => {
  let wallet, rawTx;

  beforeEach(async () => {
    const signingKey = new ethers.utils.SigningKey(
      <BytesLike>process.env.PRIVATE_KEY
    );
    wallet = new ethers.Wallet(signingKey.privateKey);

    rawTx = {
      to: "0xddB51f100672Cb252C67D516eb79931bf27cE3E6",
      value: ethers.utils.parseEther("0.001"),
      data: ethers.utils.toUtf8Bytes("Hello World"),
      nonce: await provider.getTransactionCount(wallet.address),
      gasLimit: 25000,
      gasPrice: await provider.getGasPrice(),
    };
  });
  it.skip("successfully sends a transaction and the from field matches the signer", async () => {
    const signedTx = await wallet.signTransaction(rawTx);
    const tx = await provider.sendTransaction(signedTx);
    expect(tx.hash).toBeTruthy();

    // speed things up
    //   fastForwardTime(120);

    // Validate sender of the transaction
    const minedTx = await provider.getTransaction(tx.hash);
    expect(minedTx.from).toEqual(wallet.address);
  });

  it("errors with 'from address mismatch'", async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await wallet.signTransaction({
          from: "0x3f4f037dfc910a3517b9a5b23cf036ffae01a5a7",
        });
      } catch (error) {
        if (
          error.code === ethers.utils.Logger.errors.INVALID_ARGUMENT &&
          error.argument === "transaction.from"
        ) {
          resolve(true);
          return;
        }
      }
      reject(new Error("From address mismatch did not throw"));
    });
  });

  it("errors with 'invalid transaction key: unicorn'", () => {
    return new Promise(async (resolve, reject) => {
      try {
        await wallet.signTransaction({
          unicorn: "Jerry",
        });
      } catch (error) {
        if (
          error.code === ethers.utils.Logger.errors.INVALID_ARGUMENT &&
          error.argument === "transaction:unicorn"
        ) {
          resolve(true);
          return;
        }
      }
      reject(new Error("Invalid transaction key did not throw"));
    });
  });

  it.skip("errors with 'insufficient funds for transfer'", async () => {
    const sendWallet = ethers.Wallet.createRandom();
    return new Promise(async (resolve, reject) => {
      try {
        const tx = await sendWallet.sendTransaction({
          to: "0xddb51f100672cb252c67d516eb79931bf27ce3e6",
          value: ethers.utils.parseEther("1000"),
        });
      } catch (error) {
        console.log(error);
        if (error.code === ethers.utils.Logger.errors.INSUFFICIENT_FUNDS) {
          resolve(true);
          return;
        }
      }
      reject(new Error("Insufficient funds did not throw"));
    });
  });
});
