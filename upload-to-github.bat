@echo off
chcp 65001 >nul
title Upload Construction BOQ to GitHub
color 0b

echo ========================================================
echo   ระบบอัปโหลดโปรเจกต์ Construction BOQ ขึ้น GitHub อัตโนมัติ
echo ========================================================
echo.
echo กรุณาวาง URL ของ GitHub Repository ของคุณ
echo เช่น: https://github.com/your-username/construction-boq-app.git
echo.
set /p REPO_URL="วาง GitHub Repo URL ที่นี่ แล้วกด Enter: "

if "%REPO_URL%"=="" (
    echo.
    echo [ERROR] ไม่ได้ระบุ URL กรุณาเปิดไฟล์นี้ใหม่อีกครั้ง
    pause
    exit /b
)

echo.
echo กำลังเชื่อมต่อไปยัง %REPO_URL% ...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo กำลัง Push โค้ดทั้งหมดขึ้น GitHub (ระบบอาจเปิดหน้าต่างเบราว์เซอร์ให้กดยืนยัน Login)...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] อัปโหลดโปรเจกต์ขึ้น GitHub สำเร็จเรียบร้อยแล้ว!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [INFO] หากยังไม่ได้ Login GitHub กรุณาเข้าสู่ระบบในหน้าต่างที่เด้งขึ้นมา
    echo ========================================================
)

echo.
pause
