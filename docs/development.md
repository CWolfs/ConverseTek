# Development & Setup Guide to ConverseTek

Thank you for your interest in contributing! This project uses **Chromely with CefSharp**, and is based on **.NET Framework 4.7.2**. Because of this, some setup steps differ from modern .NET (.NET 6/8) projects.

Please follow the steps below to get the project running locally.

## Prerequisites

### 1 - Install the .NET Framework 4.7.2 Developer Pack

> ❗ This is **required** to build and run the project. The **runtime alone is not enough** — you need the **Developer Pack**, which includes reference assemblies for the compiler and IDE.

📥 [Download .NET Framework 4.7.2 Developer Pack (Official Microsoft Link)](https://dotnet.microsoft.com/en-us/download/dotnet-framework/net472)

Or direct link to the offline installer:

📥 [DIRECT LINK - .NET Framework 4.7.2 Developer Pack (Official Microsoft Link)](https://dotnet.microsoft.com/en-us/download/dotnet-framework/thank-you/net472-developer-pack-offline-installer)

### ✅ Already have .NET Framework 4.8?

You're covered! The 4.8 Developer Pack is **fully backward compatible** with 4.7.2 projects — no extra install needed.

You can check your installed version using PowerShell:

```powershell
Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\' |
  Get-ItemPropertyValue -Name Release
```

A result of:

- 461808 → .NET Framework 4.7.2 (✅ Compatible)
- 533325 → .NET Framework 4.8 (✅ Compatible)

### 2 - Install NodeJS

Used to build the frontend (in the /app directory):

- v14.21.3 (✅ Compatible)

### 3 - VSCode Task Plugin

We use the Task Runner extension by actboy168 to simplify build steps.

🔌 [Download the extension from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=actboy168.tasks)

Once installed you will see the tasks at buttons in the bottom status bar of VSCode.

This helps automate:

    - Frontend builds
    - Copying files into dist/, libs/, etc.
    - Deploy-to-output steps

The tasks are defined in `.vscode/tasks.json`.

💡 These tasks are **VS Code-specific** and won't work in Visual Studio.

### 4 - Install Frontend Dependencies

- Run the task `UI Install`
- Alternatively, navigate into the `app` folder and run `npm install`

### 5 - Build Project

- Run the task `Build All`
- Alternatively, run `dotnet build /t:BuildDebug` from inside the project directory

### 6 - Run Project

- Run the task `Fast Run`, which runs the tool from the `bin` folder
- Alternatively, run `bin/x64/Debug/net472/ConverseTek.exe` from inside the project directory
