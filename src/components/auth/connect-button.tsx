"use client";

interface ConnectButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export function ConnectButton({ onClick, isLoading }: ConnectButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="px-8 py-4 bg-green-500 text-black font-bold text-lg rounded-full hover:bg-green-400 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Connecting..." : "Connect Spotify"}
    </button>
  );
}
