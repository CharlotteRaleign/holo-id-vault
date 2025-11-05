// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedNotes - Privacy-preserving note storage with FHE
/// @notice Stores encrypted notes where content is protected by FHE encryption
/// @dev Title is stored in plaintext for listing, content is encrypted using FHE
contract EncryptedNotes is SepoliaConfig {
    struct Note {
        address owner;
        string title;
        euint32 encryptedContent; // FHE-encrypted content (stored as uint32 for simplicity)
        uint64 createdAt;
    }

    Note[] private _notes;
    mapping(address => uint256[]) private _notesOf;

    event NoteStored(uint256 indexed id, address indexed owner, string title, uint64 createdAt);

    /// @notice Store a new encrypted note
    /// @param title Plaintext title for listing purposes
    /// @param encContent External encrypted content input handle
    /// @param inputProof The Zama input proof for `encContent`
    function storeNote(
        string calldata title,
        externalEuint32 encContent,
        bytes calldata inputProof
    ) external {
        euint32 content = FHE.fromExternal(encContent, inputProof);

        Note memory n;
        n.owner = msg.sender;
        n.title = title;
        n.encryptedContent = content;
        n.createdAt = uint64(block.timestamp);

        // Persist and index
        _notes.push(n);
        uint256 id = _notes.length - 1;
        _notesOf[msg.sender].push(id);

        // ACL: allow contract and user to access the encrypted content for decryption
        FHE.allowThis(_notes[id].encryptedContent);
        FHE.allow(_notes[id].encryptedContent, msg.sender);

        emit NoteStored(id, msg.sender, title, n.createdAt);
    }

    /// @notice Get note count for an owner
    /// @param owner The address to query for
    /// @return count Number of notes
    function getNoteCountByOwner(address owner) external view returns (uint256 count) {
        return _notesOf[owner].length;
    }

    /// @notice Get note ids for an owner
    /// @param owner The address to query for
    /// @return ids Array of note ids
    function getNoteIdsByOwner(address owner) external view returns (uint256[] memory ids) {
        return _notesOf[owner];
    }

    /// @notice Get metadata for a note id
    /// @param id The note id
    /// @return owner Owner address
    /// @return title Title string
    /// @return createdAt Timestamp (seconds)
    function getNoteMeta(uint256 id)
        external
        view
        returns (address owner, string memory title, uint64 createdAt)
    {
        Note storage n = _notes[id];
        return (n.owner, n.title, n.createdAt);
    }

    /// @notice Get the encrypted content for a note id
    /// @param id The note id
    /// @return encContent The FHE-encrypted content
    function getEncryptedContent(uint256 id) external view returns (euint32 encContent) {
        require(id < _notes.length, "Note does not exist");
        require(_notes[id].owner == msg.sender, "Not authorized to access this note");
        return _notes[id].encryptedContent;
    }

    /// @notice Update the title of an existing note
    /// @param id The note id
    /// @param newTitle The new title
    function updateNoteTitle(uint256 id, string calldata newTitle) external {
        require(id < _notes.length, "Note does not exist");
        require(_notes[id].owner == msg.sender, "Not authorized to update this note");

        _notes[id].title = newTitle;
    }
}

