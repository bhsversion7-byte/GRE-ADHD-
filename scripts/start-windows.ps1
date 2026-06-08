$ErrorActionPreference = "Stop"

Set-Location (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot ".."))

function Require-Command($name, $message) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw $message
  }
}

Require-Command "node" "Node.js is required. Install Node.js 22 or newer from https://nodejs.org/, then run this script again."

$nodeMajor = [int]((& node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Current version: $(node --version)"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    corepack enable
    corepack prepare pnpm@11.5.2 --activate
  } else {
    Require-Command "npm" "pnpm is not installed and npm/corepack is unavailable. Install Node.js 22 or newer from https://nodejs.org/."
    npm install -g pnpm@11.5.2
  }
}

pnpm install
pnpm dev
