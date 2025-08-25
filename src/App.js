import React, { useEffect, useRef, useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import {
  useSignAndExecuteTransaction,
  ConnectButton,
  useCurrentAccount,
} from '@mysten/dapp-kit';
import './App.css';

const LoyaltyCardPage = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [loading, setLoading] = useState(false);
  const [packageId, setPackageId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Toast state (no external libs)
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const toastTimer = useRef(null);

  // Form state
  const [mintForm, setMintForm] = useState({
    customerId: '',
    imageUrl: '',
  });

  // Track blob URL to revoke later (prevent memory leaks)
  const lastObjectUrl = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', darkMode);
    return () => {
      if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    };
  }, [darkMode]);

  // --- Utilities ---
  const showToast = (type, message, ms = 2500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), ms);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      showToast('success', 'Copied to clipboard');
    } catch {
      showToast('error', 'Copy failed');
    }
  };

  const shorten = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '');

  // --- Confetti (no libs) ---
  const burstConfetti = (count = 80) => {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const { innerWidth } = window;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'confetti';
      const size = Math.floor(Math.random() * 8) + 6; // 6–14px
      const left = Math.random() * innerWidth;
      const hue = Math.floor(Math.random() * 360);
      p.style.left = `${left}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size * 0.4}px`;
      p.style.background = `hsl(${hue} 90% 60%)`;
      p.style.animationDelay = `${Math.random() * 0.2}s`;
      p.style.transform = `rotate(${Math.random() * 180}deg)`;
      container.appendChild(p);
    }
    // Clean up after animation
    setTimeout(() => {
      container.remove();
    }, 1800);
  };

  // --- Form handlers ---
  const handleMintChange = (e) => {
    setMintForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
    lastObjectUrl.current = url;
    setMintForm((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file =
      (e.dataTransfer && e.dataTransfer.files?.[0]) ||
      (e.target && e.target.files?.[0]) ||
      null;

    processImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  // --- Mint action ---
  const mintLoyalty = async () => {
    if (!currentAccount) {
      showToast('error', 'Please connect your wallet');
      return;
    }
    try {
      setLoading(true);
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::loyalty_card::mint_loyalty`,
        arguments: [
          tx.pure.address(mintForm.customerId),
          tx.pure.string(mintForm.imageUrl), // blob: URLs are local-only. Use IPFS/HTTP for on-chain metadata.
        ],
      });

      await signAndExecute({ transaction: tx });
      setMintForm({ customerId: '', imageUrl: '' });

      burstConfetti();
      showToast('success', 'NFT minted successfully 🎉');
    } catch (error) {
      console.error('Mint failed:', error);
      showToast('error', `Mint failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrap">
      {/* Toast */}
      {toast.visible && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <header className="header">
        <h1>Mint Your NFT On SUI</h1>
        <div className="header-actions">
          <ConnectButton />
          <button
            type="button"
            className="toggle-theme"
            onClick={() => setDarkMode((d) => !d)}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="card">
        <label className="label" htmlFor="packageId">Package ID</label>
        <div className="copy-row">
          <input
            id="packageId"
            type="text"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            placeholder="Enter the contract Package ID"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => copyToClipboard(packageId)}
            aria-label="Copy package id"
            title="Copy"
          >
            📋
          </button>
        </div>
      </div>

      <section className="card">
        <h2 className="section-title">Mint a New Card</h2>

        <label className="label" htmlFor="customerId">Wallet Address</label>
        <div className="copy-row">
          <input
            id="customerId"
            type="text"
            name="customerId"
            value={mintForm.customerId}
            onChange={handleMintChange}
            placeholder="Enter Customer's SUI Address"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => copyToClipboard(mintForm.customerId)}
            aria-label="Copy wallet address"
            title="Copy"
          >
            📋
          </button>
        </div>

        <label className="label" htmlFor="imageUrl">Image URL (optional)</label>
        <input
          id="imageUrl"
          type="text"
          name="imageUrl"
          value={mintForm.imageUrl}
          onChange={handleMintChange}
          placeholder="Paste a public Image URL"
        />

        {/* Drag & Drop */}
        <div
          className={`drop-zone ${dragActive ? 'dragover' : ''}`}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('fileUpload')?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' ? document.getElementById('fileUpload')?.click() : null)}
        >
          <p>📂 Drag & drop an image here, or <span className="browse">click to browse</span></p>
          <input
            id="fileUpload"
            type="file"
            accept="image/*"
            onChange={handleFileDrop}
            style={{ display: 'none' }}
          />
        </div>

        {/* NFT Card Preview */}
        {mintForm.imageUrl && (
          <div className="nft-card">
            <div className="nft-media">
              <img
                src={mintForm.imageUrl}
                alt="NFT preview"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              />
            </div>
            <div className="nft-meta">
              <div className="meta-row">
                <span className="muted">Owner</span>
                <span className="value">{shorten(mintForm.customerId) || '—'}</span>
              </div>
              <div className="meta-row">
                <span className="muted">Preview Token</span>
                <span className="value">#{(Math.abs([...mintForm.customerId].reduce((a,c)=>a+c.charCodeAt(0),0))+1) % 9999}</span>
              </div>
            </div>
          </div>
        )}

        <button
          className="primary-btn"
          onClick={mintLoyalty}
          disabled={
            loading ||
            !packageId.trim() ||
            !mintForm.customerId.trim() ||
            !mintForm.imageUrl.trim()
          }
        >
          {loading ? 'Minting…' : 'Mint your NFT'}
        </button>

        <p className="hint">
          Heads up: files dropped here use a <code>blob:</code> URL (local).  
          For on-chain metadata, upload to IPFS and use that URL.
        </p>
      </section>
    </div>
  );
};

export default LoyaltyCardPage;
