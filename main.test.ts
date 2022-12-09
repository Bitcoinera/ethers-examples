import { TransactionRequest } from "@ethersproject/abstract-provider";
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
  it.only("errors with 'from address mismatch'", async () => {
    const rawTxWrongFrom = {
      ...rawTx,
      from: "0xddddddddddddddddddddddddddddddddddddd6",
    };
    await expect(async () => {
      await wallet.checkTransaction(rawTxWrongFrom);
    }).rejects.toThrow(TypeError("from address mismatch"));
  });
  it("errors with 'invalid transaction key: unicorn'", () => {
    const rawTxWrongKey = <TransactionRequest>{
      ...rawTx,
      from: "0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F",
      unicorn: "Jerry",
    };
    expect(wallet.checkTransaction(rawTxWrongKey)).toThrow(
      "invalid transaction key: unicorn"
    );
  });
  it("errors with 'insufficient funds for transfer'", () => {
    const rawTxNotEnoughFunds = <TransactionRequest>{
      ...rawTx,
      from: "0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F",
      value: ethers.utils.parseEther("1000.00"),
    };
    expect(provider.estimateGas(rawTxNotEnoughFunds)).toThrow(
      "insufficient funds for transfer"
    );
  });
});
