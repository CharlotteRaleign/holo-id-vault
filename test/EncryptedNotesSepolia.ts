import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedNotes } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedNotesSepolia", function () {
  let signers: Signers;
  let encryptedNotesContract: EncryptedNotes;
  let encryptedNotesContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const EncryptedNotesDeployment = await deployments.get("EncryptedNotes");
      encryptedNotesContractAddress = EncryptedNotesDeployment.address;
      encryptedNotesContract = await ethers.getContractAt("EncryptedNotes", EncryptedNotesDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should store and decrypt note on Sepolia", async function () {
    steps = 8;

    this.timeout(4 * 40000);

    const title = "Sepolia Test Note";
    const contentValue = 54321;

    progress(`Encrypting content value '${contentValue}'...`);
    const encryptedContent = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.alice.address)
      .add32(contentValue)
      .encrypt();

    progress(
      `Call storeNote() EncryptedNotes=${encryptedNotesContractAddress} handle=${ethers.hexlify(encryptedContent.handles[0])} signer=${signers.alice.address}...`,
    );
    let tx = await encryptedNotesContract
      .connect(signers.alice)
      .storeNote(title, encryptedContent.handles[0], encryptedContent.inputProof);
    await tx.wait();

    progress(`Call getNoteCountByOwner()...`);
    const noteCount = await encryptedNotesContract.getNoteCountByOwner(signers.alice.address);
    expect(noteCount).to.be.gte(1);

    progress(`Call getNoteIdsByOwner()...`);
    const noteIds = await encryptedNotesContract.getNoteIdsByOwner(signers.alice.address);
    const noteId = noteIds[noteIds.length - 1]; // Get the latest note

    progress(`Call getNoteMeta() for noteId=${noteId}...`);
    const [owner, retrievedTitle, createdAt] = await encryptedNotesContract.getNoteMeta(noteId);
    expect(owner).to.eq(signers.alice.address);
    expect(retrievedTitle).to.eq(title);

    progress(`Call getEncryptedContent() for noteId=${noteId}...`);
    const encryptedContentHandle = await encryptedNotesContract.getEncryptedContent(noteId);
    expect(encryptedContentHandle).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting encrypted content handle=${encryptedContentHandle}...`);
    const decryptedContent = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedContentHandle,
      encryptedNotesContractAddress,
      signers.alice,
    );
    progress(`Decrypted content value=${decryptedContent}`);

    expect(decryptedContent).to.eq(contentValue);
  });
});


