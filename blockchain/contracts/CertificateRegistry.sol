// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    struct Certificate {
        bytes32 hash;
        address issuer;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Certificate) public certificates;
    address public owner;

    event CertificateIssued(bytes32 indexed hash, address indexed issuer, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can issue certificates");
        _;
    }

    function issueCertificate(bytes32 _hash) public onlyOwner {
        require(!certificates[_hash].exists, "Certificate already exists");

        certificates[_hash] = Certificate({
            hash: _hash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit CertificateIssued(_hash, msg.sender, block.timestamp);
    }

    function verifyCertificate(bytes32 _hash) public view returns (bool, address, uint256) {
        Certificate memory cert = certificates[_hash];
        return (cert.exists, cert.issuer, cert.timestamp);
    }
}
