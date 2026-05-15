for /r %%i in (node_modules) do @if exist "%%i" rd /s /q "%%i"
for /r %%i in (.next) do @if exist "%%i" rd /s /q "%%i"
