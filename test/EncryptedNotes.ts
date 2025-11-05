import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedNotes, EncryptedNotes__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedNotes")) as EncryptedNotes__factory;
  const encryptedNotesContract = (await factory.deploy()) as EncryptedNotes;
  const encryptedNotesContractAddress = await encryptedNotesContract.getAddress();

  return { encryptedNotesContract, encryptedNotesContractAddress };
}

describe("EncryptedNotes", function () {
  let signers: Signers;
  let encryptedNotesContract: EncryptedNotes;
  let encryptedNotesContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ encryptedNotesContract, encryptedNotesContractAddress } = await deployFixture());
  });

  it("should store and retrieve encrypted note", async function () {
    const title = "My First Note";
    const contentValue = 12345; // Encrypted content value

    // Encrypt the content
    const encryptedContent = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.alice.address)
      .add32(contentValue)
      .encrypt();

    // Store the note
    const tx = await encryptedNotesContract
      .connect(signers.alice)
      .storeNote(title, encryptedContent.handles[0], encryptedContent.inputProof);
    await tx.wait();

    // Get note count
    const noteCount = await encryptedNotesContract.getNoteCountByOwner(signers.alice.address);
    expect(noteCount).to.eq(1);

    // Get note IDs
    const noteIds = await encryptedNotesContract.getNoteIdsByOwner(signers.alice.address);
    expect(noteIds.length).to.eq(1);
    expect(noteIds[0]).to.eq(0);

    // Get note metadata
    const [owner, retrievedTitle, createdAt] = await encryptedNotesContract.getNoteMeta(0);
    expect(owner).to.eq(signers.alice.address);
    expect(retrievedTitle).to.eq(title);
    expect(createdAt).to.be.gt(0);

    // Get encrypted content
    const encryptedContentHandle = await encryptedNotesContract.getEncryptedContent(0);
    expect(encryptedContentHandle).to.not.eq(ethers.ZeroHash);

    // Decrypt the content
    const decryptedContent = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedContentHandle,
      encryptedNotesContractAddress,
      signers.alice,
    );
    expect(decryptedContent).to.eq(contentValue);
  });

  it("should allow multiple notes per user", async function () {
    // Store first note
    const encryptedContent1 = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.alice.address)
      .add32(111)
      .encrypt();

    let tx = await encryptedNotesContract
      .connect(signers.alice)
      .storeNote("Note 1", encryptedContent1.handles[0], encryptedContent1.inputProof);
    await tx.wait();

    // Store second note
    const encryptedContent2 = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.alice.address)
      .add32(222)
      .encrypt();

    tx = await encryptedNotesContract
      .connect(signers.alice)
      .storeNote("Note 2", encryptedContent2.handles[0], encryptedContent2.inputProof);
    await tx.wait();

    // Verify count
    const noteCount = await encryptedNotesContract.getNoteCountByOwner(signers.alice.address);
    expect(noteCount).to.eq(2);

    // Verify both notes can be decrypted
    const noteIds = await encryptedNotesContract.getNoteIdsByOwner(signers.alice.address);

    const encryptedHandle1 = await encryptedNotesContract.getEncryptedContent(noteIds[0]);
    const decrypted1 = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedHandle1,
      encryptedNotesContractAddress,
      signers.alice,
    );

    const encryptedHandle2 = await encryptedNotesContract.getEncryptedContent(noteIds[1]);
    const decrypted2 = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedHandle2,
      encryptedNotesContractAddress,
      signers.alice,
    );

    expect(decrypted1 + decrypted2).to.eq(333); // 111 + 222
  });

  it("should isolate notes between different users", async function () {
    // Alice stores a note
    const encryptedContent = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.alice.address)
      .add32(999)
      .encrypt();

    let tx = await encryptedNotesContract
      .connect(signers.alice)
      .storeNote("Alice's Note", encryptedContent.handles[0], encryptedContent.inputProof);
    await tx.wait();

    // Bob stores a note
    const encryptedContentBob = await fhevm
      .createEncryptedInput(encryptedNotesContractAddress, signers.bob.address)
      .add32(888)
      .encrypt();

    tx = await encryptedNotesContract
      .connect(signers.bob)
      .storeNote("Bob's Note", encryptedContentBob.handles[0], encryptedContentBob.inputProof);
    await tx.wait();

    // Verify isolation
    const aliceCount = await encryptedNotesContract.getNoteCountByOwner(signers.alice.address);
    const bobCount = await encryptedNotesContract.getNoteCountByOwner(signers.bob.address);

    expect(aliceCount).to.eq(1);
    expect(bobCount).to.eq(1);

    // Verify Alice can only see her note
    const aliceNoteIds = await encryptedNotesContract.getNoteIdsByOwner(signers.alice.address);
    const [, aliceTitle] = await encryptedNotesContract.getNoteMeta(aliceNoteIds[0]);
    expect(aliceTitle).to.eq("Alice's Note");

    // Verify Bob can only see his note
    const bobNoteIds = await encryptedNotesContract.getNoteIdsByOwner(signers.bob.address);
    const [, bobTitle] = await encryptedNotesContract.getNoteMeta(bobNoteIds[0]);
    expect(bobTitle).to.eq("Bob's Note");
  });
});


