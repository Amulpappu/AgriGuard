@echo off
title AgriGuard - Laptop Server & Multi-User Host
color 0A

echo ======================================================================
echo           AGRIGUARD - AI CROP HEALTH & DIAGNOSTIC SYSTEM
echo            (Laptop Host Server with Cloudflare Remote Tunnel)
echo ======================================================================
echo.
echo [*] Starting AgriGuard server on your laptop...
echo [*] Each user can register separate accounts with separate data!
echo [*] All accounts and scan photos will be saved locally on this laptop:
echo     - Database: backend/agriguard.db
echo     - User Photos: backend/uploads/users/[username]/
echo.

cd /d "%~dp0"
AgriGuard.exe

pause
