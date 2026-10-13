// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {WebAuthn} from "@openzeppelin/contracts/utils/cryptography/WebAuthn.sol";
import {Bytes} from "@openzeppelin/contracts/utils/Bytes.sol";

/// @notice Public identity registry. No admin, upgrade, or custody authority.
contract OrvenaRegistry is EIP712 {
    struct ProfileInput {
        string name;
        string bio;
        bytes32 avatar;
        bytes32 qx;
        bytes32 qy;
        bytes32 rpIdHash;
        string origin;
    }
    struct Profile {
        bool exists;
        string name;
        string bio;
        bytes32 avatar;
        bytes32 qx;
        bytes32 qy;
        bytes32 rpIdHash;
        string origin;
        uint64 verifiedAt;
    }
    struct Record { bool exists; uint64 recordedAt; }

    bytes32 public constant CREATE_TYPEHASH = keccak256("CreateProfile(address owner,bytes32 profileHash,uint256 nonce,uint256 deadline)");
    bytes32 public constant UPDATE_TYPEHASH = keccak256("UpdateProfile(address owner,bytes32 profileHash,uint256 nonce,uint256 deadline)");
    bytes32 public constant RECORD_TYPEHASH = keccak256("RecordData(address owner,bytes32 dataHash,uint256 nonce,uint256 deadline)");
    bytes32 public constant PROOF_TYPEHASH = keccak256("ProvePasskeyControl(address owner,uint256 nonce,uint256 deadline)");
    mapping(address => uint256) public nonces;
    mapping(address => Profile) private profiles;
    mapping(address => mapping(bytes32 => Record)) private records;

    error InvalidSignature();
    error Expired();
    error ProfileExists();
    error ProfileMissing();
    error InvalidProfile();
    error InvalidProof();
    error RecordExists();
    error InvalidRecord();
    event ProfileCreated(address indexed owner, bytes32 indexed profileHash);
    event ProfileUpdated(address indexed owner, bytes32 indexed profileHash);
    event DataRecorded(address indexed owner, bytes32 indexed dataHash, uint64 recordedAt);
    event PasskeyControlVerified(address indexed owner, uint64 verifiedAt);

    constructor() EIP712("OrvenaRegistry", "1") {}

    function getProfile(address owner) external view returns (Profile memory) { return profiles[owner]; }
    function getRecord(address owner, bytes32 dataHash) external view returns (Record memory) { return records[owner][dataHash]; }

    function hashProfile(ProfileInput calldata input) public pure returns (bytes32) {
        return keccak256(abi.encode(keccak256(bytes(input.name)), keccak256(bytes(input.bio)), input.avatar, input.qx, input.qy, input.rpIdHash, keccak256(bytes(input.origin))));
    }

    function createProfile(address owner, ProfileInput calldata input, uint256 deadline, bytes calldata signature) external {
        if (profiles[owner].exists) revert ProfileExists();
        _validate(input);
        bytes32 payloadHash = hashProfile(input);
        _authorize(owner, keccak256(abi.encode(CREATE_TYPEHASH, owner, payloadHash, nonces[owner], deadline)), deadline, signature);
        profiles[owner] = Profile(true, input.name, input.bio, input.avatar, input.qx, input.qy, input.rpIdHash, input.origin, 0);
        emit ProfileCreated(owner, payloadHash);
    }

    /// @dev The registration key and RP context are immutable; changes require a new identity.
    function updateProfile(address owner, string calldata name, string calldata bio, bytes32 avatar, uint256 deadline, bytes calldata signature) external {
        Profile storage profile = profiles[owner];
        if (!profile.exists) revert ProfileMissing();
        if (bytes(name).length == 0 || bytes(name).length > 64 || bytes(bio).length > 280) revert InvalidProfile();
        bytes32 payloadHash = keccak256(abi.encode(keccak256(bytes(name)), keccak256(bytes(bio)), avatar));
        _authorize(owner, keccak256(abi.encode(UPDATE_TYPEHASH, owner, payloadHash, nonces[owner], deadline)), deadline, signature);
        profile.name = name;
        profile.bio = bio;
        profile.avatar = avatar;
        emit ProfileUpdated(owner, payloadHash);
    }

    function recordData(address owner, bytes32 dataHash, uint256 deadline, bytes calldata signature) external {
        if (!profiles[owner].exists) revert ProfileMissing();
        if (dataHash == bytes32(0)) revert InvalidRecord();
        if (records[owner][dataHash].exists) revert RecordExists();
        _authorize(owner, keccak256(abi.encode(RECORD_TYPEHASH, owner, dataHash, nonces[owner], deadline)), deadline, signature);
        uint64 recordedAt = uint64(block.timestamp);
        records[owner][dataHash] = Record(true, recordedAt);
        emit DataRecorded(owner, dataHash, recordedAt);
    }

    function proofChallenge(address owner, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(PROOF_TYPEHASH, owner, nonces[owner], deadline)));
    }

    /// @notice Separate P256 proof, requiring browser type/challenge, RP, origin, UP and UV.
    /// @dev Origin index points to the full `"origin":"..."` field, as OZ does for type/challenge.
    function provePasskeyControl(address owner, uint256 deadline, WebAuthn.WebAuthnAuth calldata auth, uint256 originIndex) external {
        Profile storage profile = profiles[owner];
        if (!profile.exists) revert ProfileMissing();
        if (block.timestamp > deadline) revert Expired();
        bytes memory data = auth.authenticatorData;
        bytes memory json = bytes(auth.clientDataJSON);
        bytes memory expectedOrigin = abi.encodePacked('"origin":"', profile.origin, '"');
        if (data.length < 37 || data.length > 1024 || json.length > 2048 || originIndex > json.length || expectedOrigin.length > json.length - originIndex) revert InvalidProof();
        bytes32 actualRpHash;
        assembly ("memory-safe") { actualRpHash := mload(add(data, 32)) }
        if (actualRpHash != profile.rpIdHash || keccak256(Bytes.slice(json, originIndex, originIndex + expectedOrigin.length)) != keccak256(expectedOrigin)) revert InvalidProof();
        if (!WebAuthn.verify(abi.encodePacked(proofChallenge(owner, deadline)), auth, profile.qx, profile.qy, true)) revert InvalidProof();
        nonces[owner]++;
        profile.verifiedAt = uint64(block.timestamp);
        emit PasskeyControlVerified(owner, profile.verifiedAt);
    }

    function _authorize(address owner, bytes32 structHash, uint256 deadline, bytes calldata signature) private {
        if (block.timestamp > deadline) revert Expired();
        if (owner == address(0) || ECDSA.recover(_hashTypedDataV4(structHash), signature) != owner) revert InvalidSignature();
        nonces[owner]++;
    }

    function _validate(ProfileInput calldata input) private pure {
        if (bytes(input.name).length == 0 || bytes(input.name).length > 64 || bytes(input.bio).length > 280 || bytes(input.origin).length == 0 || bytes(input.origin).length > 200 || input.qx == bytes32(0) || input.qy == bytes32(0) || input.rpIdHash == bytes32(0)) revert InvalidProfile();
    }
}
