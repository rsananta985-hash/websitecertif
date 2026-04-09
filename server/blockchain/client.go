package blockchain

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ABI for CertificateRegistry contract
const contractABI = `[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "hash", "type": "bytes32"},
      {"indexed": true, "name": "issuer", "type": "address"},
      {"name": "timestamp", "type": "uint256"}
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "inputs": [{"name": "_hash", "type": "bytes32"}],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_hash", "type": "bytes32"}],
    "name": "verifyCertificate",
    "outputs": [
      {"name": "", "type": "bool"},
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
]`

// Client wraps the Ethereum client and contract binding
type Client struct {
	eth          *ethclient.Client
	bound        *bind.BoundContract
	auth         *bind.TransactOpts
	contractAddr common.Address
}

// VerifyResult holds the result of a blockchain verification
type VerifyResult struct {
	Exists    bool
	Issuer    string
	Timestamp int64
	TxHash    string
}

// NewClient creates a new blockchain client
func NewClient(rpcURL, privateKeyHex, contractAddress string) (*Client, error) {
	eth, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to ethereum node: %w", err)
	}

	// Parse private key
	privKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	// Get chain ID
	chainID, err := eth.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Create transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privKey, chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transactor: %w", err)
	}

	// Parse ABI
	parsedABI, err := abi.JSON(strings.NewReader(contractABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ABI: %w", err)
	}

	addr := common.HexToAddress(contractAddress)
	bound := bind.NewBoundContract(addr, parsedABI, eth, eth, eth)

	return &Client{
		eth:          eth,
		bound:        bound,
		auth:         auth,
		contractAddr: addr,
	}, nil
}

// IssueCertificate registers a hash on the blockchain, returns tx hash
func (c *Client) IssueCertificate(hashHex string) (string, error) {
	decoded, err := hex.DecodeString(strings.TrimPrefix(hashHex, "0x"))
	if err != nil || len(decoded) != 32 {
		return "", fmt.Errorf("invalid hash format (expected 32 bytes hex)")
	}
	var hash32 [32]byte
	copy(hash32[:], decoded)

	tx, err := c.bound.Transact(c.auth, "issueCertificate", hash32)
	if err != nil {
		return "", fmt.Errorf("transaction failed: %w", err)
	}
	return tx.Hash().Hex(), nil
}

// VerifyCertificate checks if a hash exists on-chain
func (c *Client) VerifyCertificate(hashHex string) (*VerifyResult, error) {
	decoded, err := hex.DecodeString(strings.TrimPrefix(hashHex, "0x"))
	if err != nil || len(decoded) != 32 {
		return nil, fmt.Errorf("invalid hash format")
	}
	var hash32 [32]byte
	copy(hash32[:], decoded)

	var results []interface{}
	if err := c.bound.Call(&bind.CallOpts{}, &results, "verifyCertificate", hash32); err != nil {
		return nil, fmt.Errorf("call failed: %w", err)
	}
	if len(results) < 3 {
		return nil, fmt.Errorf("unexpected result count: %d", len(results))
	}

	exists, _ := results[0].(bool)
	issuer, _ := results[1].(common.Address)
	ts, _ := results[2].(*big.Int)

	var timestamp int64
	if ts != nil {
		timestamp = ts.Int64()
	}

	return &VerifyResult{
		Exists:    exists,
		Issuer:    issuer.Hex(),
		Timestamp: timestamp,
	}, nil
}
