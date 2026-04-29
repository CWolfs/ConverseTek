# Development & Setup Guide

Thank you for your interest in contributing. ConverseTek is a **.NET Framework 4.7.2** desktop app with a **WebView2 / Edge Chromium** shell and a **React + TypeScript + MobX** frontend built with Vite.

Please follow the steps below to get the project running locally.

## Prerequisites

### 1 - Install the .NET Framework 4.7.2 Developer Pack

This is required to build and run the project. The runtime alone is not enough; you need the Developer Pack, which includes reference assemblies for the compiler and IDE.

- [Download .NET Framework 4.7.2 Developer Pack](https://dotnet.microsoft.com/en-us/download/dotnet-framework/net472)
- [Direct offline installer link](https://dotnet.microsoft.com/en-us/download/dotnet-framework/thank-you/net472-developer-pack-offline-installer)

If you already have the .NET Framework 4.8 Developer Pack, you are covered. It is backward compatible with 4.7.2 projects.

You can check your installed version using PowerShell:

```powershell
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\' |
  Get-ItemPropertyValue -Name Release
```

Useful results:

- `461808` - .NET Framework 4.7.2 compatible
- `533325` - .NET Framework 4.8 compatible

### 2 - Install NodeJS

Used to build the frontend in `app/`.

- v20.19.2 is known compatible.

### 3 - Install the WebView2 Runtime

Most modern Windows systems already have the evergreen WebView2 runtime through Microsoft Edge. If the app fails to start because WebView2 is missing, install the Microsoft Edge WebView2 Runtime.

### 4 - VS Code Task Plugin

We use the Task Runner extension by actboy168 to simplify build steps.

- [Download the extension from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=actboy168.tasks)

Once installed, the tasks appear as buttons in the bottom status bar of VS Code. They are defined in `.vscode/tasks.json`.

These tasks are VS Code-specific and will not work in Visual Studio.

### 5 - Install Game-Related Dependencies

ConverseTek uses two BattleTech C# assemblies. Copy them from the game into the ConverseTek `libs/` folder before building:

- `ShadowrunDTO.dll`
- `ShadowrunSerializer.dll`

They are found under `BATTLETECH/BattleTech_Data/Managed`.

### 6 - Install Frontend Dependencies

- Run the task `CT: UI Install`.
- Alternatively, navigate into `app/` and run `npm install`.

## Build & Run

### Normal Fast Development

1. Run `CT: Build Server` once to build the backend exe.
2. Run `CT: Fast Dev`.

`CT: Fast Dev` starts or reuses Vite at `http://127.0.0.1:5173/`, then starts the WebView2 desktop shell with `CT_WEB_URL` set. This gives frontend hot reload while keeping the backend bridge available.

Backend changes require another `CT: Build Server` and a restart of the desktop app.

### Static Debug Build

1. Run `CT: UI Build` to build the frontend and copy `dist/` into the debug output folder.
2. Run `CT: Fast Run` to launch `bin/x64/Debug/net472/ConverseTek.exe`.

### Full Build

- Run `CT: Build All`.
- Alternatively, run `dotnet build ConverseTek.csproj /t:BuildDebug` from the project directory.

## Useful Frontend Commands

Run these from `app/` unless using `npm --prefix app ...` from the repo root.

```bash
npm run ts-check
npm run lint
npm run lint:fix
npm run test
npm run build
npm start
```

`npm start` only starts the Vite server. For real app testing, prefer `CT: Fast Dev` so WebView2 and the backend bridge are available.

## DevTools

F12 opens the WebView2 inspector in debug/dev builds. Backend logs are mirrored into the console with a `[ConverseTek backend]` prefix.

For React component inspection, run `CT: RTool` before or during `CT: Fast Dev`; the Vite dev page injects the standalone React DevTools connector.
