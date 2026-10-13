// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {WebAuthn} from "@openzeppelin/contracts/utils/cryptography/WebAuthn.sol";
import {Bytes} from "@openzeppelin/contracts/utils/Bytes.sol";
import {OrvenaRegistry} from "./OrvenaRegistry.sol";

/// @notice Portable content approvals. Every approval AND revocation requires fresh WebAuthn/P256.
/// @dev No admin, upgrade, funds, EOA-signature bypass, or plaintext content storage.
contract OrvenaApprovals is EIP712 {
    struct Approval {
        address owner;
        bytes32 commitment;
        bytes32 parentId;
        uint64 approvedAt;
        uint64 revokedAt;
    }
    OrvenaRegistry public immutable registry;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => Approval) private approvals;
    bytes32 public constant APPROVE_TYPEHASH = keccak256("ApproveContent(address owner,bytes32 commitment,bytes32 parentId,uint256 nonce,uint256 deadline)");
    bytes32 public constant REVOKE_TYPEHASH = keccak256("RevokeApproval(address owner,bytes32 approvalId,uint256 nonce,uint256 deadline)");
    error InvalidApproval();
    error InvalidParent();
    error InvalidProof();
    error Expired();
    error AlreadyRevoked();
    event ContentApproved(bytes32 indexed approvalId, address indexed owner, bytes32 commitment, bytes32 parentId, uint64 approvedAt);
    event ApprovalRevoked(bytes32 indexed approvalId, address indexed owner, uint64 revokedAt);

    constructor(address registryAddress) EIP712("OrvenaApprovals", "1") {
        if (registryAddress.code.length == 0) revert InvalidApproval();
        registry = OrvenaRegistry(registryAddress);
    }
    function getApproval(bytes32 id) external view returns (Approval memory) { return approvals[id]; }
    function approvalChallenge(address owner, bytes32 commitment, bytes32 parentId, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(APPROVE_TYPEHASH, owner, commitment, parentId, nonces[owner], deadline)));
    }
    function revocationChallenge(address owner, bytes32 id, uint256 deadline) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(REVOKE_TYPEHASH, owner, id, nonces[owner], deadline)));
    }
    function approveContent(address owner, bytes32 commitment, bytes32 parentId, uint256 deadline, WebAuthn.WebAuthnAuth calldata auth, uint256 originIndex) external returns (bytes32 id) {
        if (owner == address(0) || commitment == bytes32(0)) revert InvalidApproval();
        if (parentId != bytes32(0) && approvals[parentId].owner != owner) revert InvalidParent();
        id = approvalChallenge(owner, commitment, parentId, deadline);
        _verify(owner, id, deadline, auth, originIndex);
        nonces[owner]++;
        approvals[id] = Approval(owner, commitment, parentId, uint64(block.timestamp), 0);
        emit ContentApproved(id, owner, commitment, parentId, uint64(block.timestamp));
    }
    function revokeApproval(bytes32 id, uint256 deadline, WebAuthn.WebAuthnAuth calldata auth, uint256 originIndex) external {
        Approval storage approval = approvals[id];
        if (approval.owner == address(0)) revert InvalidApproval();
        if (approval.revokedAt != 0) revert AlreadyRevoked();
        _verify(approval.owner, revocationChallenge(approval.owner, id, deadline), deadline, auth, originIndex);
        nonces[approval.owner]++;
        approval.revokedAt = uint64(block.timestamp);
        emit ApprovalRevoked(id, approval.owner, uint64(block.timestamp));
    }
    function _verify(address owner, bytes32 challenge, uint256 deadline, WebAuthn.WebAuthnAuth calldata auth, uint256 originIndex) private view {
        if (block.timestamp > deadline) revert Expired();
        OrvenaRegistry.Profile memory profile = registry.getProfile(owner);
        if (!profile.exists) revert InvalidProof();
        bytes memory data = auth.authenticatorData;
        bytes memory json = bytes(auth.clientDataJSON);
        bytes memory expectedOrigin = abi.encodePacked('"origin":"', profile.origin, '"');
        if (data.length < 37 || data.length > 1024 || json.length > 2048 || originIndex > json.length || expectedOrigin.length > json.length - originIndex) revert InvalidProof();
        bytes32 actualRpHash;
        assembly ("memory-safe") { actualRpHash := mload(add(data, 32)) }
        if (actualRpHash != profile.rpIdHash || keccak256(Bytes.slice(json, originIndex, originIndex + expectedOrigin.length)) != keccak256(expectedOrigin)) revert InvalidProof();
        if (!WebAuthn.verify(abi.encodePacked(challenge), auth, profile.qx, profile.qy, true)) revert InvalidProof();
    }
}
