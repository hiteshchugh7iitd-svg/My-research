@echo off
rem Same as start_windows.bat, but phones / tablets on the same Wi-Fi can open the
rem operator station (scan, upload, take photos) while this PC shows the 3D wall.
rem Windows Firewall will ask once: choose "Allow" for Private networks.
call "%~dp0start_windows.bat" --host 0.0.0.0 %*
